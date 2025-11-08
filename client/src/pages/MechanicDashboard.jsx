import { useEffect, useState } from "react";
import axios from "axios";

function MechanicDashboard() {
  const [requests, setRequests] = useState([]);
  const token = localStorage.getItem("token");

  // Fetch service requests assigned to mechanic
  useEffect(() => {
    axios
      .get("http://localhost:5001/service-requests", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setRequests(res.data))
      .catch((err) => console.error("Error fetching requests:", err));
  }, [token]);

  // Accept request
  const acceptRequest = async (id) => {
    try {
      await axios.post(
        `http://localhost:5001/service-requests/${id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Request accepted ✅");
      refreshRequests();
    } catch (err) {
      console.error(err);
      alert("Error accepting request");
    }
  };

  // Update status
  const updateStatus = async (id, status) => {
    try {
      await axios.post(
        `http://localhost:5001/service-requests/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Status updated to ${status} ✅`);
      refreshRequests();
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    }
  };

  // refresh helper
  const refreshRequests = async () => {
    const res = await axios.get("http://localhost:5001/service-requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRequests(res.data);
  };

  return (
    <div style={{ padding: "2rem", color: "white" }}>
      <h2>Mechanic Dashboard</h2>

      {requests.length === 0 ? (
        <p>No requests found.</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Description</th>
              <th>Address</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r._id}>
                <td>{r.problemDescription}</td>
                <td>{r.address || '-'}</td>
                <td>{r.status}</td>
                <td>
                  {r.status === "Pending" && (
                    <button onClick={() => acceptRequest(r._id)}>Accept</button>
                  )}
                  {r.status === "Accepted" && (
                    <button onClick={() => updateStatus(r._id, "Completed")}>
                      Mark Completed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MechanicDashboard;
