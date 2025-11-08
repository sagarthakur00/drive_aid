import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
    <div style={{ padding: "2rem", color: "white" }}>
      <h2>Admin Dashboard</h2>

      {/* --- Create Service Request Form --- */}
      <h3 style={{ marginTop: "2rem" }}>Create Service Request</h3>
      <form onSubmit={handleCreateRequest} style={{ marginBottom: "2rem" }}>
        <input
          type="text"
          placeholder="Problem Description"
          value={problemDescription}
          onChange={(e) => setProblemDescription(e.target.value)}
          required
          style={{ padding: "8px", marginRight: "10px" }}
        />
        <input
          type="text"
          placeholder="Address (e.g. MG Road, Bangalore)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          style={{ padding: "8px", marginRight: "10px", minWidth: 220 }}
        />
        <button type="submit" style={{ padding: "8px 16px" }}>
          Create Request
        </button>
      </form>

      {/* --- Mechanics Table --- */}
      <h3>Mechanics</h3>
      {mechanics.length === 0 ? (
        <p>No mechanics found.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ marginBottom: "2rem" }}>
          <thead>
            <tr>
              <th>Shop Name</th>
              <th>Services</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {mechanics.map((m) => (
              <tr key={m._id}>
                <td>{m.shopName}</td>
                <td>{m.services.join(", ")}</td>
                <td>{m.isVerified ? "✅ Verified" : "❌ Pending"}</td>
                <td>
                  {!m.isVerified && (
                    <button onClick={() => verifyMechanic(m._id)}>
                      Verify
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* --- Requests Table --- */}
      <h3>All Service Requests</h3>
      {requests.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Description</th>
              <th>Status</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r._id}>
                <td>{r.problemDescription}</td>
                <td>{r.status}</td>
                <td>{r.address || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminDashboard;
