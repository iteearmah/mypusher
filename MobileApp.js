import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, ScrollView } from 'react-native';
import Pusher from 'pusher-js/react-native';

// Pusher-js requires some global variables to be defined in React Native environment
// Usually handled by the package, but sometimes needs explicit import or setup.

const PUSHER_KEY = 'any-key';
const PUSHER_CLUSTER = 'mt1';
const SERVER_URL = 'http://YOUR_SERVER_IP:3000'; // Use actual IP for mobile testing

export default function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      wsHost: 'YOUR_SERVER_IP',
      wsPort: 3000,
      forceTLS: false,
      disableStats: true,
      enabledTransports: ['ws', 'wss']
    });

    const channel = pusher.subscribe('my-channel');
    channel.bind('my-event', (data) => {
      setMessages((prevMessages) => [...prevMessages, data.message]);
    });

    return () => {
      pusher.unsubscribe('my-channel');
    };
  }, []);

  const sendMessage = async () => {
    if (!message) return;

    try {
      await fetch(`${SERVER_URL}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: 'my-channel',
          event: 'my-event',
          data: { message: message }
        }),
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pusher Mobile Client</Text>
      <ScrollView style={styles.messagesContainer}>
        {messages.map((msg, index) => (
          <Text key={index} style={styles.message}>Received: {msg}</Text>
        ))}
      </ScrollView>
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Type a message..."
      />
      <Button title="Send" onPress={sendMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  messagesContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
});
