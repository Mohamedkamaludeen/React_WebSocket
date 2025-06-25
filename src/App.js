import { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  TextField,
  Button,
  Box,
} from "@mui/material";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [nickname, setNickname] = useState("");
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    const socket = new SockJS("http://localhost:8090/ws");
    const client = Stomp.over(socket);

    client.connect({}, (frame) => {
      console.log("Connected: " + frame);
      setStompClient(client);
      client.subscribe("/topic/messages", (message) => {
        const newMessage = JSON.parse(message.body);
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });
    });

    return () => {
      if (client) {
        client.disconnect(() => {
          console.log("Disconnected");
        });
      }
    };
  }, []);

  const handleNicknameChange = (e) => {
    setNickname(e.target.value);
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const sendMessage = () => {
    if (stompClient && message.trim() !== "") {
      const chatMessage = {
        nickname: nickname || "Anonymous",
        content: message,
      };
      stompClient.send("/app/chat", {}, JSON.stringify(chatMessage));
      setMessage("");
    }
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>   
        <TextField
          label="Nickname"
          variant="outlined"
          value={nickname}
          onChange={handleNicknameChange}
        />
        <TextField
          label="Message"
          variant="outlined"
          value={message}
          onChange={handleMessageChange}
          onKeyPress={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          fullWidth
        />
        <Button
          variant="contained"
          onClick={sendMessage}
          disabled={!message.trim()}
        >
          Send
        </Button>
      </Box>

      <List>
        {messages.map((msg, index) => (
          <ListItem key={index} alignItems="flex-start">
            <ListItemAvatar>
              <Avatar>{msg.nickname.charAt(0).toUpperCase()}</Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography variant="subtitle1" fontWeight="bold">
                  {msg.nickname}
                </Typography>
              }
              secondary={<Typography variant="body2">{msg.content}</Typography>}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default App;
