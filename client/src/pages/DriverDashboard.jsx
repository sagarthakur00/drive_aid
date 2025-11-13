import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";

const socket = io("http://localhost:5001");

export default function DriverDashboard() {
  const [requests, setRequests] = useState([]);
  const [problemDescription, setProblemDescription] = useState("");
  const [address, setAddress] = useState("");
  const [activeRequest, setActiveRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const navigate = useNavigate();
  const joinedRoomsRef = useRef({});

  const headers = { Authorization: `Bearer ${token}` };

  const fetchRequests = async () => {
    const res = await axios.get("http://localhost:5001/service-requests", { headers });
    setRequests(res.data);
  };

  useEffect(() => {
    if (role !== "driver") {
      alert("You must be a driver to access this page.");
      navigate("/");
      return;
    }
    fetchRequests();
  }, [role]);

  useEffect(() => {
    socket.on("receive_message", (msg) => {
      if (msg.requestId === activeRequest?._id) {
        setMessages((prev) => [...prev, msg]);
      }
    });
    return () => {
      socket.off("receive_message");
    };
  }, [activeRequest]);

  const createRequest = async (e) => {
    e.preventDefault();
    await axios.post(
      "http://localhost:5001/service-requests",
      { problemDescription, address },
      { headers }
    );
    setProblemDescription("");
    setAddress("");
    fetchRequests();
  };

  const openChat = async (req) => {
    setActiveRequest(req);
    // join room
    if (!joinedRoomsRef.current[req._id]) {
      socket.emit("join_room", req._id);
      joinedRoomsRef.current[req._id] = true;
    }
    // load history
    const { data } = await axios.get(`http://localhost:5001/chat/${req._id}`, { headers });
    setMessages(data);
  };

  const send = async () => {
    if (!text.trim() || !activeRequest) return;
    const tempId = Date.now();
    const optimisticMsg = { tempId, message: text, createdAt: new Date().toISOString() };
    
    // Add optimistic message
    setMessages((prev) => [...prev, optimisticMsg]);
    setText("");
    
    try {
      // Persist via REST - server returns canonical message
      const { data } = await axios.post(
        `http://localhost:5001/chat/${activeRequest._id}`,
        { message: text },
        { headers }
      );
      
      // Replace optimistic with server response
      setMessages((prev) => prev.map((m) => (m.tempId === tempId ? data : m)));
    } catch (err) {
      console.error("Error sending message:", err);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
    }
  };

  return (
    <DashboardLayout
      title="Driver Dashboard"
      icon="🚗"
      gradient="from-blue-600 via-cyan-600 to-teal-700"
    >
      <div className="space-y-8">

        {/* Create Request Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Request Roadside Assistance</h2>
          </div>
          
          <form onSubmit={createRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Describe your problem"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
            />
            <Input
              placeholder="Your current location"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <div className="md:col-span-2">
              <Button type="submit" className="w-full md:w-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Request Help
              </Button>
            </div>
          </form>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Requests Table */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">My Service Requests</h2>
            </div>
            
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500">No requests yet. Create your first request above!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Problem</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.problemDescription}</TableCell>
                      <TableCell className="text-gray-500">{r.address}</TableCell>
                      <TableCell>
                        <Badge variant={
                          r.status === "Pending" ? "pending" :
                          r.status === "Accepted" ? "accepted" : "completed"
                        }>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openChat(r)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Chat
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Chat Panel */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Live Chat</h2>
              {activeRequest && (
                <Badge variant="primary" className="ml-auto">
                  {activeRequest.status}
                </Badge>
              )}
            </div>
            
            {!activeRequest ? (
              <div className="text-center py-12">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500 text-lg font-medium">Select a request to start chatting</p>
                <p className="text-gray-400 text-sm mt-2">Communicate with mechanics in real-time</p>
              </div>
            ) : (
              <div className="flex flex-col h-96">
                <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                  {messages.map((m) => (
                    <div key={m._id || m.tempId} className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="text-xs text-gray-500 mb-2">
                        {new Date(m.createdAt || Date.now()).toLocaleTimeString()}
                      </div>
                      <div className="text-gray-800">{m.message}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && send()}
                    placeholder="Type your message..."
                    className="flex-1"
                  />
                  <Button onClick={send} disabled={!text.trim()}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
