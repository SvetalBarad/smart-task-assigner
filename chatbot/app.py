import streamlit as st
import requests
import os
from dotenv import load_dotenv
import mysql.connector
from datetime import datetime

# Load environment variables
load_dotenv("../.env")

# Page config
st.set_page_config(
    page_title="TaskFlow AI Assistant",
    page_icon="🤖",
    layout="wide"
)

# Custom CSS
st.markdown("""
<style>
    .stChatMessage { border-radius: 10px; margin-bottom: 10px; }
    .stChatInputContainer { border-radius: 10px; }
    h1 { font-size: 1.5rem; }
</style>
""", unsafe_allow_html=True)

# Ollama configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

# Check Ollama connection
def check_ollama():
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            data = response.json()
            models = [m["name"] for m in data.get("models", [])]
            return True, models
        return False, []
    except:
        return False, []

# Database connection helper
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "smart_ai"),
            port=int(os.getenv("DB_PORT", 3306))
        )
        return conn
    except Exception as e:
        return None

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "👋 Hi! I'm your TaskFlow AI Assistant. I can help you with:\n\n• Viewing your tasks and projects\n• Getting task summaries\n• Understanding project status\n• General productivity tips\n\nWhat would you like to know?"}
    ]

# Sidebar
with st.sidebar:
    st.title("🤖 TaskFlow AI")
    st.markdown("Your intelligent project assistant")

    # Ollama status
    ollama_ok, available_models = check_ollama()
    if ollama_ok:
        st.success("✅ Ollama Connected")
        if available_models:
            st.info(f"Models: {', '.join(available_models)}")
        else:
            st.warning("No models found. Run: `ollama pull llama3.2`")
    else:
        st.error("❌ Ollama not running")
        st.info("Start Ollama: `ollama serve`")
        st.info("Install model: `ollama pull llama3.2`")

    st.divider()

    # Database status
    conn = get_db_connection()
    if conn:
        st.success("✅ Database Connected")
        conn.close()
    else:
        st.error("❌ Database Disconnected")

    st.divider()

    # Model selection
    if available_models:
        selected_model = st.selectbox(
            "Select Model",
            available_models,
            index=0 if OLLAMA_MODEL in available_models else 0
        )
        st.session_state.selected_model = selected_model
    else:
        st.session_state.selected_model = OLLAMA_MODEL

    if st.button("🗑️ Clear Chat History", use_container_width=True):
        st.session_state.messages = [
            {"role": "assistant", "content": "Chat history cleared! How can I help you?"}
        ]
        st.rerun()

# Display chat messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Handle user input
if prompt := st.chat_input("Ask me anything about your tasks..."):
    # Add user message to history
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    # Generate AI response
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            try:
                # Get context from database
                conn = get_db_connection()
                context = ""
                if conn:
                    cursor = conn.cursor(dictionary=True)

                    # Get recent tasks
                    cursor.execute("""
                        SELECT title, status, priority
                        FROM tasks
                        ORDER BY created_at DESC
                        LIMIT 5
                    """)
                    tasks = cursor.fetchall()
                    if tasks:
                        context += "Recent Tasks:\n"
                        for task in tasks:
                            context += f"- {task['title']} ({task['status']}, {task['priority']})\n"

                    # Get project count
                    cursor.execute("SELECT COUNT(*) as count FROM projects")
                    proj_result = cursor.fetchone()
                    if proj_result:
                        context += f"\nTotal Projects: {proj_result['count']}\n"

                    # Get task stats
                    cursor.execute("""
                        SELECT status, COUNT(*) as count
                        FROM tasks
                        GROUP BY status
                    """)
                    stats = cursor.fetchall()
                    if stats:
                        context += "\nTask Status Summary:\n"
                        for stat in stats:
                            context += f"- {stat['status']}: {stat['count']} tasks\n"

                    cursor.close()
                    conn.close()

                # Build system prompt
                system_prompt = f"""You are TaskFlow AI Assistant, a helpful AI that helps users manage their tasks and projects.

Here is the current project context:
{context}

Guidelines:
- Be friendly and concise
- Use the data above to answer questions about tasks and projects
- If asked about something not in the data, say you don't have that information
- Format responses with bullet points when appropriate
- Current date: {datetime.now().strftime('%Y-%m-%d')}
"""

                # Call Ollama API
                model = st.session_state.get("selected_model", OLLAMA_MODEL)

                response = requests.post(
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            *[{
                                "role": m["role"],
                                "content": m["content"]
                            } for m in st.session_state.messages if m["role"] != "assistant"],
                            {"role": "user", "content": prompt}
                        ],
                        "stream": False
                    },
                    timeout=120
                )

                if response.status_code == 200:
                    result = response.json()
                    assistant_response = result["message"]["content"]

                    # Add assistant response to history
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": assistant_response
                    })

                    st.markdown(assistant_response)
                else:
                    error_msg = f"❌ Ollama error: {response.status_code}"
                    st.markdown(error_msg)
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": error_msg
                    })

            except requests.exceptions.ConnectionError:
                error_msg = "❌ Cannot connect to Ollama. Make sure Ollama is running (`ollama serve`)"
                st.markdown(error_msg)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": error_msg
                })
            except Exception as e:
                error_msg = f"❌ Error: {str(e)}"
                st.markdown(error_msg)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": error_msg
                })
