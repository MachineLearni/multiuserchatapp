/* global __app_id, __firebase_config, __initial_auth_token */
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Main App component for the chat application
const App = () => {
  // State to hold Firebase instances and user information
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);

  // State for messages, new message input, and loading status
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // State for dark mode
  const [darkMode, setDarkMode] = useState(false);

  // Reference for scrolling to the latest message
  const messagesEndRef = useRef(null);

  // Get the app ID and Firebase config from the global variables provided by the environment
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

  // CSS for the message animation and background gradient
  const styles = `
    @keyframes slideInFromBottom {
      0% {
        transform: translateY(20px);
        opacity: 0;
      }
      100% {
        transform: translateY(0);
        opacity: 1;
      }
    }
    .message-animation {
      animation: slideInFromBottom 0.3s ease-out;
    }
    .bg-gradient {
      background-image: linear-gradient(to bottom right, #f8fafc, #e0f2fe);
    }
    .dark .bg-gradient {
      background-image: linear-gradient(to bottom right, #1f2937, #111827);
    }
  `;

  // Initialize Firebase and handle authentication on component mount
  useEffect(() => {
    const setupFirebase = async () => {
      try {
        // Initialize Firebase app
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);
        setDb(firestore);
        setAuth(firebaseAuth);

        // Sign in the user with the provided custom token or anonymously
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
          await signInAnonymously(firebaseAuth);
        }

        // Set the user ID once authentication state is ready
        firebaseAuth.onAuthStateChanged(user => {
          if (user) {
            setUserId(user.uid);
            setLoading(false);
          } else {
            setUserId(crypto.randomUUID());
            setLoading(false);
          }
        });

      } catch (error) {
        console.error("Error setting up Firebase:", error);
        setLoading(false);
      }
    };

    setupFirebase();
  }, []);

  // Effect to listen for real-time chat messages
  useEffect(() => {
    // Only proceed if db and userId are available
    if (db && userId) {
      // Define the collection path for public data
      const chatCollectionPath = `/artifacts/${appId}/public/data/chatMessages`;
      const messagesCollection = collection(db, chatCollectionPath);
      
      // Create a query to get messages ordered by timestamp
      const q = query(messagesCollection, orderBy('createdAt'));

      // Subscribe to real-time updates with onSnapshot
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          // Convert Firestore Timestamp to a JavaScript Date object if it exists
          createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date(),
        }));
        setMessages(fetchedMessages);
      }, (error) => {
        console.error("Error fetching messages:", error);
      });

      // Cleanup function to unsubscribe from the listener
      return () => unsubscribe();
    }
  }, [db, userId, appId]); // Dependencies ensure the listener is set up correctly

  // Effect to scroll to the bottom of the message list when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle the form submission for sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !db || !userId) {
      return;
    }

    try {
      // Add a new document to the chatMessages collection
      await addDoc(collection(db, `/artifacts/${appId}/public/data/chatMessages`), {
        text: newMessage,
        uid: userId, // Store the user ID
        createdAt: serverTimestamp(), // Use server timestamp for consistency
      });

      // Clear the input field
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Toggle dark mode state
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Render the loading state while Firebase is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <p>Loading chat...</p>
      </div>
    );
  }

  // Main chat application UI
  return (
    <div className={`flex flex-col h-screen font-sans dark.bg-gradient`}>
      <style>{styles}</style>
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center rounded-b-xl">
        <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Multi-User Chat</h1>
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <span className="font-semibold text-gray-600 dark:text-gray-300">Your User ID:</span>
          <span className="font-mono bg-gray-200 dark:bg-gray-700 p-1 rounded-md text-xs truncate max-w-xs">{userId}</span>
        </div>
      </header>

      {/* Chat messages display area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length > 0 ? (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.uid === userId ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`message-animation p-4 rounded-3xl max-w-lg shadow-md ${
                msg.uid === userId
                  ? 'bg-indigo-500 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
              }`}>
                {/* Display sender's UID if it's not the current user */}
                {msg.uid !== userId && (
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    {msg.uid}
                  </div>
                )}
                <p>{msg.text}</p>
                <div className={`text-xs mt-1 ${
                  msg.uid === userId
                    ? 'text-indigo-200'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {msg.createdAt.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 dark:text-gray-400">Start the conversation!</p>
          </div>
        )}
        {/* Empty div for auto-scrolling to the bottom */}
        <div ref={messagesEndRef} />
      </main>

      {/* Message input form */}
      <footer className="bg-white dark:bg-gray-800 p-4 shadow-top rounded-t-xl">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-colors duration-200 disabled:opacity-50"
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;
