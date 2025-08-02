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
  Paper,
  IconButton,
  Badge,
  Container,
  Card,
  CardContent,
} from "@mui/material";
import {
  Send as SendIcon,
  Person as PersonIcon,
  Login as LoginIcon,
} from "@mui/icons-material";

function LoginForm({ onLogin }) {
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    if (userId.trim()) {
      setIsLoading(true);
      setTimeout(() => {
        onLogin(userId.trim());
        setIsLoading(false);
      }, 500);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 400, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Avatar
              sx={{
                mx: "auto",
                mb: 2,
                bgcolor: "#075e54",
                width: 64,
                height: 64,
              }}
            >
              <LoginIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography
              variant="h4"
              gutterBottom
              sx={{ color: "#075e54", fontWeight: "bold" }}
            >
              Chat Login
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter your User ID to start chatting
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="User ID"
              variant="outlined"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyPress={handleKeyPress}
              fullWidth
              placeholder="Enter your unique user ID"
              disabled={isLoading}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <Button
              variant="contained"
              onClick={handleLogin}
              disabled={!userId.trim() || isLoading}
              size="large"
              sx={{
                py: 1.5,
                bgcolor: "#075e54",
                "&:hover": { bgcolor: "#064e45" },
                borderRadius: 2,
                textTransform: "none",
                fontSize: "1.1rem",
              }}
            >
              {isLoading ? "Logging in..." : "Enter Chat"}
            </Button>
          </Box>

          <Box sx={{ mt: 3, p: 2, bgcolor: "#f5f5f5", borderRadius: 2 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              💡 Tip: Use any unique identifier as your User ID (e.g.,
              "user123", "alice", "bob")
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

function App() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (userId) => {
    setCurrentUserId(userId);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setCurrentUserId("");
    setIsAuthenticated(false);
  };

  return isAuthenticated ? (
    <ChatInterface currentUserId={currentUserId} onLogout={handleLogout} />
  ) : (
    <LoginForm onLogin={handleLogin} />
  );
}

function ChatInterface({ currentUserId, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const mockChatUsers = [
      {
        userId: "36360441-a715-45c3-88d8-2c5a2b0b9815",
        nickname: "Chanuka Rathnayaka",
        lastMessage: "Hey there!",
        timestamp: "2024-01-20T10:30:00",
        unreadCount: 2,
      },
      {
        userId: "user789",
        nickname: "Bob Smith",
        lastMessage: "See you later",
        timestamp: "2024-01-20T09:15:00",
        unreadCount: 0,
      },
      {
        userId: "442abe02-c8cb-4337-a083-55e95657d5b2",
        nickname: "Temp User",
        lastMessage: "Thanks!",
        timestamp: "2024-01-19T18:45:00",
        unreadCount: 1,
      },
    ];
    setChatUsers(mockChatUsers);
  }, []);

  useEffect(() => {
    const socket = new SockJS("https://localhost:8080/ws");
    const client = Stomp.over(socket);

    client.connect({}, (frame) => {
      setStompClient(client);
      client.subscribe(`/user/${currentUserId}/queue/messages`, (message) => {
        const notification = JSON.parse(message.body);
        if (selectedUser && notification.senderId === selectedUser.userId) {
          fetchMessages(currentUserId, selectedUser.userId);
        }
        updateChatUsersList(notification);
      });
    });

    return () => {
      if (client) client.disconnect(() => console.log("Disconnected"));
    };
  }, [currentUserId, selectedUser]);

  const updateChatUsersList = (notification) => {
    setChatUsers((prev) => {
      const existingUser = prev.find(
        (user) => user.userId === notification.senderId
      );
      if (existingUser) {
        return prev.map((user) =>
          user.userId === notification.senderId
            ? {
                ...user,
                lastMessage: notification.content,
                unreadCount: user.unreadCount + 1,
              }
            : user
        );
      } else {
        return [
          ...prev,
          {
            userId: notification.senderId,
            nickname: notification?.senderNickname || "Unknown",
            lastMessage: notification.content,
            timestamp: notification.timestamp,
            unreadCount: 1,
          },
        ];
      }
    });
  };

  const fetchMessages = async (senderId, recipientId) => {
    try {
      const res = await fetch(
        `https://localhost:8080/api/gem/messages/${senderId}/${recipientId}`
      );
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setMessages([]);
    fetchMessages(currentUserId, user.userId);
    setChatUsers((prev) =>
      prev.map((u) => (u.userId === user.userId ? { ...u, unreadCount: 0 } : u))
    );
  };

  const sendMessage = () => {
    if (stompClient && message.trim() && selectedUser) {
      const chatMsg = {
        senderId: currentUserId,
        recipientId: selectedUser.userId,
        content: message,
        timeStamp: new Date().toISOString(),
      };
      stompClient.send("/app/chat", {}, JSON.stringify(chatMsg));
      setMessages((prev) => [...prev, chatMsg]);
      setMessage("");
      setChatUsers((prev) =>
        prev.map((user) =>
          user.userId === selectedUser.userId
            ? {
                ...user,
                lastMessage: message,
                timestamp: new Date().toISOString(),
              }
            : user
        )
      );
    }
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (ts) => {
    const date = new Date(ts);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);
    return date.toDateString() === today.toDateString()
      ? formatTime(ts)
      : date.toDateString() === yest.toDateString()
      ? "Yesterday"
      : date.toLocaleDateString();
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f0f0f0" }}>
      {/* Left Panel */}
      <Paper
        sx={{
          width: 350,
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          borderRight: "1px solid #e0e0e0",
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: "#075e54",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">Chats</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption">{currentUserId}</Typography>
            <Button size="small" onClick={onLogout} sx={{ color: "white" }}>
              Logout
            </Button>
          </Box>
        </Box>

        <List sx={{ flex: 1, overflow: "auto", p: 0 }}>
          {chatUsers.map(
            (user) =>
              user.userId != currentUserId && (
                <ListItem
                  key={user.userId}
                  button
                  onClick={() => handleUserSelect(user)}
                  sx={{
                    bgcolor:
                      selectedUser?.userId === user.userId
                        ? "#e8f5e8"
                        : "transparent",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      color="success"
                      variant="dot"
                      invisible={!onlineUsers.has(user.userId)}
                    >
                      <Avatar sx={{ bgcolor: "#075e54" }}>
                        {user.nickname.charAt(0)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          noWrap
                        >
                          {user.nickname}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(user.timestamp)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                          sx={{ flex: 1 }}
                        >
                          {user.lastMessage}
                        </Typography>
                        {user.unreadCount > 0 && (
                          <Badge
                            badgeContent={user.unreadCount}
                            color="success"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              )
          )}
        </List>
      </Paper>

      {/* Chat Area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {selectedUser ? (
          <>
            <Paper
              sx={{
                p: 2,
                bgcolor: "#075e54",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)" }}>
                {selectedUser.nickname.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6">{selectedUser.nickname}</Typography>
                <Typography variant="caption">
                  {onlineUsers.has(selectedUser.userId)
                    ? "Online"
                    : "Last seen recently"}
                </Typography>
              </Box>
            </Paper>

            <Box sx={{ flex: 1, overflow: "auto", p: 1, bgcolor: "#e5ddd5" }}>
              {messages.map((msg, idx) => {
                const isOwn = msg.senderId === currentUserId;
                return (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      justifyContent: isOwn ? "flex-end" : "flex-start",
                      mb: 1,
                    }}
                  >
                    <Paper
                      sx={{
                        p: 1.5,
                        maxWidth: "70%",
                        bgcolor: isOwn ? "#dcf8c6" : "white",
                        borderRadius: 2,
                      }}
                    >
                      <Typography>{msg.content}</Typography>
                      <Typography
                        variant="caption"
                        textAlign="right"
                        display="block"
                      >
                        {formatTime(msg.timestamp)}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
            </Box>

            <Box sx={{ p: 2, bgcolor: "#f0f0f0", display: "flex", gap: 1 }}>
              <TextField
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                fullWidth
                size="small"
                multiline
                maxRows={4}
                sx={{
                  bgcolor: "white",
                  "& .MuiOutlinedInput-root": { borderRadius: 3 },
                }}
              />
              <IconButton
                onClick={sendMessage}
                disabled={!message.trim()}
                sx={{
                  bgcolor: "#075e54",
                  color: "white",
                  "&:hover": { bgcolor: "#064e45" },
                  "&:disabled": { bgcolor: "#ccc" },
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              bgcolor: "#e5ddd5",
            }}
          >
            <PersonIcon sx={{ fontSize: 120, color: "#ccc", mb: 2 }} />
            <Typography variant="h5" color="text.secondary">
              Welcome to Chat, {currentUserId}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Select a user from the left sidebar to start chatting
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default App;
