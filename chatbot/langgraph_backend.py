from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_ollama import ChatOllama
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph.message import add_messages
from dotenv import load_dotenv
from langchain_core.runnables.config import RunnableConfig
import sqlite3
import subprocess
import json
import os

load_dotenv()

# `llm` was previously created here but never used.  Instantiating a
# ChatOllama client at import time triggers a manifest pull, which causes the
# Streamlit server to exit on low‑RAM machines.  We now create clients inside
# `chat_node` as needed.

class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

def chat_node(state: ChatState, config: RunnableConfig):
    messages = state['messages']
    # if there are no incoming messages yet, we are simply being asked for the
    # current state (e.g. during initialization).  Avoid doing any model
    # detection or network activity in that case.
    if not messages:
        return {"messages": []}

    # Determine installed Ollama models via `http://localhost:11434/api/tags`
    # and try to pick one that is small enough to load in our limited memory environment.
    installed = []
    sizes = {}  # model name -> size in bytes
    try:
        import urllib.request, json
        req = urllib.request.Request("http://localhost:11434/api/tags")
        with urllib.request.urlopen(req, timeout=2) as response:
            data = json.loads(response.read().decode('utf-8'))
            for model_obj in data.get('models', []):
                name = model_obj.get('name')
                sizes[name] = model_obj.get('size')
                installed.append(name)
    except Exception as e:
        # couldn't query Ollama at all; it's likely not running.
        installed = []

    # Attempt to auto-install a tiny model if none of the currently-installed
    # ones look small enough (we'll pull `mistral-mini` and hope for the best).
    preferred_mini = ["mistral-mini", "llama-mini", "llama2-mini"]
    # Determine if there is a model <=8GB already
    threshold = 8 * 1024**3
    if not any((sizes.get(m, 0) or 0) <= threshold for m in installed):
        try:
            subprocess.run(["ollama", "pull", "mistral-mini"], check=True)
            installed.append("mistral-mini")
            sizes["mistral-mini"] = None  # unknown until list available next time
        except Exception:
            # ignore; we'll just fall back to error later
            pass

    # Define ordered preferred models, starting with the smallest variants.
    # We'll only include models whose reported size is below the threshold.
    preferred = [
        "qwen2:0.5b",
        "llama3.2:1b",
        "mistral-mini",
        "llama-mini",
        "llama2-mini",
        "mistral",
        "gemma3:27b",
    ]
    threshold = 8 * 1024**3  # 8 gigabytes

    # build candidate list respecting both preference order and size limits
    models_to_try = []
    for p in preferred:
        for inst in installed:
            if inst == p or inst.startswith(p) or p in inst:
                size = sizes.get(inst)
                if size is not None and size > threshold:
                    # skip overly large model
                    continue
                if inst not in models_to_try:
                    models_to_try.append(inst)
    # if we still have no candidates, consider any installed model that looks small
    if not models_to_try:
        for inst in installed:
            size = sizes.get(inst)
            if size is None or size <= threshold:
                models_to_try.append(inst)
    # if we still have nothing, return informative error message
    if not models_to_try:
        # no local model fit; try falling back to a remote OpenAI API if we have
        # a key.  this lets the chatbot "do everything itself" even on low-RAM
        # machines.
        try:
            from openai import OpenAI
            key = os.getenv("OPENAI_API_KEY")
            if key:
                client = OpenAI(api_key=key)
                # convert our stored messages to the format OpenAI expects
                payload = []
                for m in messages:
                    if isinstance(m, HumanMessage):
                        role = "user"
                    elif isinstance(m, AIMessage):
                        role = "assistant"
                    else:
                        role = "user"
                    payload.append({"role": role, "content": m.content})
                comp = client.chat.completions.create(model="gpt-3.5-turbo", messages=payload)
                text = comp.choices[0].message.content
                return {"messages": [AIMessage(content=text)]}
            else:
                # no API key available
                msg = (
                    "No suitable Ollama model is installed that fits within the available "
                    "memory, and no OpenAI API key was found. "
                    "Set OPENAI_API_KEY or install a small local model."
                )
                return {"messages": [AIMessage(content=msg)]}
        except Exception as e:
            # if the OpenAI call fails (e.g. invalid key, out of quota, no internet),
            # return the actual error so you can see what went wrong.
            err_msg = f"Failed to connect to OpenAI using the provided API key.\n\nError details: {str(e)}"
            return {"messages": [AIMessage(content=err_msg)]}

        msg = (
            "No suitable Ollama model is installed that fits within the available "
            "memory. Please install a smaller model (e.g. `ollama pull mistral-mini`) "
            "or run this code on a machine with more RAM."
        )
        return {"messages": [AIMessage(content=msg)]}

    last_exc = None
    for model_name in models_to_try:
        try:
            client = ChatOllama(model=model_name, streaming=True)
            response = client.invoke(messages, config=config)
            return {"messages": [response]}
        except Exception as e:
            # ignore memory-related errors and continue
            last_exc = e
            continue

    # if all chosen candidates failed, give a final diagnosis using the last
    # exception we saw
    err_msg = f"Model request failed for all available models: {last_exc}"
    return {"messages": [AIMessage(content=err_msg)]}

conn = sqlite3.connect(database='chatbot.db', check_same_thread=False)
# Checkpointer
checkpointer = SqliteSaver(conn=conn)
checkpointer.setup()
graph = StateGraph(ChatState)
graph.add_node("chat_node", chat_node)
graph.add_edge(START, "chat_node")
graph.add_edge("chat_node", END)

chatbot = graph.compile(checkpointer=checkpointer)
def retrieve_all_threads():
    all_threads = set()
    for checkpoint in checkpointer.list(None):
        all_threads.add(checkpoint.config['configurable']['thread_id'])

    return list(all_threads)
