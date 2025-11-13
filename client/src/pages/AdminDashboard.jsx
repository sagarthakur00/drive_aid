import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";

function AdminDashboard() {
  const [mechanics, setMechanics] = useState([]);
  const [requests, setRequests] = useState([]);
  const [problemDescription, setProblemDescription] = useState("");
  const [address, setAddress] = useState("");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  // Fetch mechanics + requests
  const fetchData = async () => {
    try {
      const [mechRes, reqRes] = await Promise.all([
        axios.get("http://localhost:5001/mechanics", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://localhost:5001/service-requests", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setMechanics(mechRes.data);
      setRequests(reqRes.data);
    } catch (err) {
      console.error("Error fetching:", err);
    }
  };

  useEffect(() => {
    // Simple client-side guard: only allow admins
    if (role !== "admin") {
      alert("You must be an admin to access this page.");
      navigate("/mechanic");
      return;
    }
    fetchData();
  }, [role]);

  // ✅ Create new request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:5001/service-requests",
        { problemDescription, address },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Service request created ✅");
      setProblemDescription("");
      setAddress("");
      fetchData();
    } catch (err) {
      console.error("Error creating request:", err);
      if (err?.response?.status === 403) {
        alert("Forbidden: please login as admin to create requests.");
      } else {
        alert("Failed to create request");
      }
    }
  };

  // ✅ Verify mechanic
  const verifyMechanic = async (id) => {
    try {
      await axios.put(
        `http://localhost:5001/mechanics/${id}/verify`,
        { isVerified: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Mechanic verified ✅");
      fetchData();
    } catch (err) {
      alert("Error verifying mechanic");
    }
  };

  return (
    <DashboardLayout
      title="Admin Dashboard"
      icon="👨‍💼"
      gradient="from-purple-600 via-indigo-600 to-blue-700"
    >
      <div className="space-y-8">

        {/* Create Service Request Form */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create Service Request</h2>
          </div>
          
          <form onSubmit={handleCreateRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Problem Description"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
            />
            <Input
              placeholder="Address (e.g. MG Road, Bangalore)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <div className="md:col-span-2">
              <Button type="submit" className="w-full md:w-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Request
              </Button>
            </div>
          </form>
        </Card>

        {/* Mechanics Table */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Mechanics Management</h2>
          </div>
          
          {mechanics.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500">No mechanics found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop Name</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mechanics.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell className="font-medium">{m.shopName}</TableCell>
                    <TableCell className="text-gray-500">{m.services.join(", ")}</TableCell>
                    <TableCell>
                      <Badge variant={m.isVerified ? "success" : "warning"}>
                        {m.isVerified ? "✅ Verified" : "⏳ Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!m.isVerified && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => verifyMechanic(m._id)}
                        >
                          Verify
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* All Service Requests */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">All Service Requests</h2>
          </div>
          
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500">No requests yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell className="font-medium">{r.problemDescription}</TableCell>
                    <TableCell>
                      <Badge variant={
                        r.status === "Pending" ? "pending" :
                        r.status === "Accepted" ? "accepted" : "completed"
                      }>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">{r.address || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
