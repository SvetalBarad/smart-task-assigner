import streamlit as st
from langgraph_backend import chatbot
from langchain_core.messages import HumanMessage
import uuid

# **************************************** HARD RESET ***********************************

if st.sidebar.button("🧹 Clear All Chats"):
    st.session_state.clear()
    st.stop()

# **************************************** SESSION INIT *********************************

def create_thread(label=None):
    new_id = str(uuid.uuid4())
    if not label:
        label = f"Chat {len(st.session_state.get('chat_threads', [])) + 1}"
    st.session_state['chat_threads'].append({'thread_id': new_id, 'label': label})
    st.session_state['thread_id'] = new_id
    st.session_state['active_thread_id'] = new_id
    st.session_state['message_history'] = []
    return new_id

if 'initialized' not in st.session_state:
    st.session_state['initialized'] = True
    st.session_state['message_history'] = []
    st.session_state['chat_threads'] = []
    st.session_state['thread_id'] = None
    create_thread('Chat 1')

# Ensure current thread exists and fallback if needed
current_thread_id = st.session_state.get('thread_id')
thread_ids = [t['thread_id'] for t in st.session_state['chat_threads']]
if current_thread_id not in thread_ids:
    create_thread()

# **************************************** FUNCTIONS ************************************

def load_conversation(thread_id):
    state = chatbot.get_state(config={'configurable': {'thread_id': thread_id}})
    return state.values.get('messages', [])

# **************************************** SIDEBAR **************************************

st.sidebar.title('AUTOBOT')

# ➕ New Chat
if st.sidebar.button('➕ New Chat'):
    create_thread(f"Chat {len(st.session_state['chat_threads']) + 1}")

st.sidebar.header('💬 My Conversations')

search_query = st.sidebar.text_input('Search threads', '')

filtered_threads = [t for t in reversed(st.session_state['chat_threads']) if search_query.lower() in t['label'].lower()]

for i, thread in enumerate(filtered_threads, start=1):
    label = f"{thread['label']}"
    if st.sidebar.button(label, key=f"thread_{thread['thread_id']}"):
        st.session_state['thread_id'] = thread['thread_id']

# ensure we load a thread when selected
if st.session_state.get('thread_id') and st.session_state.get('active_thread_id') != st.session_state['thread_id']:
    history_messages = load_conversation(st.session_state['thread_id'])
    st.session_state['message_history'] = [
        {'role': 'user' if isinstance(msg, HumanMessage) else 'assistant', 'content': msg.content}
        for msg in history_messages
    ]
    st.session_state['active_thread_id'] = st.session_state['thread_id']

# **************************************** MAIN CHAT ************************************

for message in st.session_state['message_history']:
    with st.chat_message(message['role']):
        st.text(message['content'])

user_input = st.chat_input('Type here...')

if user_input:
    st.session_state['message_history'].append({'role': 'user', 'content': user_input})
    with st.chat_message('user'):
        st.text(user_input)

    CONFIG = {
        'configurable': {'thread_id': st.session_state['thread_id']},
        'metadata': {'thread_id': st.session_state['thread_id']},
        'run_name': 'chat_turn',
    }

    with st.chat_message('assistant'):
        ai_message = st.write_stream(
            message_chunk.content
            for message_chunk, metadata in chatbot.stream(
                {'messages': [HumanMessage(content=user_input)]},
                config=CONFIG,
                stream_mode='messages'
            )
        )

    st.session_state['message_history'].append({'role': 'assistant', 'content': ai_message})