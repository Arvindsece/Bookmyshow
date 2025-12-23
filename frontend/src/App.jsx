import { useEffect, useState } from "react";
import { api } from "./api";



function App() {
  const [showId, setShowId] = useState("");
  const [seats, setSeats] = useState([]);
  const [name, setName] = useState("");
  const [selectedSeat, setSelectedSeat] = useState("");
  const [currentBooking, setCurrentBooking] = useState(null);
  const [seatSnapshot, setSeatSnapshot] = useState(null);
  const [status, setStatus] = useState("");

  const seedShow = async () => {
    try {
      const res = await api.post("/seats/seed");
      setShowId(res.data.showId);
      setStatus("");
      setCurrentBooking(null);
      await loadSeats();
    } catch (error) {
      console.error("Error seeding show:", error);
      alert("Error creating show and seats");
    }
  };

  const loadSeats = async () => {
    if (!showId) return;
    try {
      const res = await api.get(`/seats?showId=${showId}`);
      setSeats(res.data);
      
      if (selectedSeat) {
        await loadSeatSnapshot();
      }
    } catch (error) {
      console.error("Error loading seats:", error);
    }
  };

  const loadSeatSnapshot = async () => {
    if (!showId || !selectedSeat) return;
    try {
      const res = await api.get(`/seats/snapshot?showId=${showId}&seatId=${selectedSeat}`);
      setSeatSnapshot(res.data);
    } catch (error) {
      console.error("Error loading seat snapshot:", error);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return iso;
    }
  };

  const holdSeat = async () => {
    if (!name || !selectedSeat || !showId) {
      alert("Please enter name, select seat, and ensure show ID is set");
      return;
    }
    try {
      const res = await api.post("/seats/hold", {
        showId,
        seatId: selectedSeat,
        name
      });
      setCurrentBooking({
        bookingId: res.data.bookingId,
        heldBy: name,
        status: "HELD"
      });
      setStatus("HELD");
      await loadSeats();
      await loadSeatSnapshot();
    } catch (error) {
      console.error("Error holding seat:", error);
      alert(error.response?.data?.error || "Error holding seat");
    }
  };

  const confirmSeat = async () => {
    if (!currentBooking?.bookingId) {
      alert("No active booking to confirm");
      return;
    }
    try {
      await api.post("/seats/confirm", {
        bookingId: currentBooking.bookingId
      });
      setStatus("CONFIRMED");
      setCurrentBooking(null);
      await loadSeats();
      await loadSeatSnapshot();
    } catch (error) {
      console.error("Error confirming seat:", error);
      alert(error.response?.data?.error || "Error confirming booking");
    }
  };

  const cancelHold = async () => {
    if (!showId || !selectedSeat) {
      alert("Please select a seat");
      return;
    }
    try {
      await api.post("/seats/cancel", {
        showId,
        seatId: selectedSeat
      });
      setStatus("");
      setCurrentBooking(null);
      await loadSeats();
      await loadSeatSnapshot();
    } catch (error) {
      console.error("Error cancelling hold:", error);
      alert(error.response?.data?.error || "Error cancelling hold");
    }
  };

  useEffect(() => {
    if (showId) {
      loadSeats();
    }
  }, [showId]);

  // Poll seats periodically so other users' actions (holds/bookings) show up in the UI
  useEffect(() => {
    if (!showId) return;
    const intervalId = setInterval(() => {
      loadSeats();
    }, 3000); // every 3 seconds
    return () => clearInterval(intervalId);
  }, [showId]);

  // When a seat is selected, poll its snapshot so the detailed view updates in near-real time
  useEffect(() => {
    if (!showId || !selectedSeat) return;
    const intervalId = setInterval(() => {
      loadSeatSnapshot();
    }, 2000); // every 2 seconds
    return () => clearInterval(intervalId);
  }, [showId, selectedSeat]);

  useEffect(() => {
    if (selectedSeat && showId) {
      loadSeatSnapshot();
      // Check if this seat has a current booking
      const seat = seats.find(s => s.seatId === selectedSeat);
      if (seat?.status === "HELD") {
        // Check if this seat is held by the current user
        if (seat.heldBy === name && seat.bookingId) {
          setCurrentBooking({
            bookingId: seat.bookingId,
            heldBy: seat.heldBy,
            status: "HELD"
          });
          setStatus("HELD");
        } else {
          setCurrentBooking(null);
          setStatus(seat.status);
        }
      } else {
        setCurrentBooking(null);
        setStatus(seat?.status || "");
      }
    }
  }, [selectedSeat, seats, name, showId]);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif", backgroundColor: "#e4d6d6ff", color: "#000000", minHeight: "100vh" }}>
      <h1 style={{ color: "#000000" }}>Book My Show</h1>

      <div style={{ marginBottom: 20 }}>
        <button 
          onClick={seedShow}
          style={{ marginRight: 10, padding: "8px 16px", backgroundColor: "#b43b3bff", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Seed Show + 30 Seats
        </button>
        <button 
          onClick={loadSeats}
          style={{ padding: "8px 16px", backgroundColor: "#70cf30ff", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Refresh Seats
        </button>
      </div>

      <div style={{ marginBottom: 15 }}>
        <label style={{ display: "block", marginBottom: 5, fontWeight: "bold", color: "#080606ff" }}>Show ID:</label>
        <input
          type="text"
          value={showId}
          onChange={e => setShowId(e.target.value)}
          placeholder="Show ID will be generated when you seed"
          style={{ width: "400px", padding: "8px", fontSize: "14px", border: "1px solid #883737ff", borderRadius: 4 }}
          
        />
      </div>

      <div style={{ marginBottom: 15 }}>
        <label style={{ display: "block", marginBottom: 5, fontWeight: "bold", color: "#090808ff" }}>Seat Selector:</label>
        <select
          value={selectedSeat}
          onChange={e => setSelectedSeat(e.target.value)}
          style={{ padding: "8px", fontSize: "14px", border: "1px solid #0a0707ff", borderRadius: 4, minWidth: "150px" }}
        >
          <option value="">Select Seat</option>
          {seats.filter(s => s.status !== "BOOKED").map(s => (
            <option key={s.seatId} value={s.seatId}>
              {s.seatId}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 15 }}>
        <label style={{ display: "block", marginBottom: 5, fontWeight: "bold", color: "#0c0b0bff" }}>Name:</label>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ padding: "8px", fontSize: "14px", border: "1px solid #0f0c0cff", borderRadius: 4, minWidth: "200px" }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <button 
          onClick={holdSeat}
          style={{ marginRight: 10, padding: "8px 16px", backgroundColor: "#7e228eff", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Checkout (Hold Seat)
        </button>
        <button 
          onClick={confirmSeat}
          style={{ marginRight: 10, padding: "8px 16px", backgroundColor: "#55650eff", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Confirm (mock payment)
        </button>
        <button 
          onClick={cancelHold}
          style={{ padding: "8px 16px", backgroundColor: "#11d2f9ff", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Cancel Hold
        </button>
      </div>

      {status && (
        <div style={{ marginBottom: 20, padding: "15px", backgroundColor: "#f5f5f5", borderRadius: 4, border: "1px solid #ddd", color: "#000000" }}>
          <div style={{ marginBottom: 5, color: "#000000" }}>
            <strong style={{ color: "#000000" }}>Status: {status}</strong> {status === "HELD" && <span style={{ color: "green" }}>✓</span>}
          </div>
          {currentBooking?.bookingId && (
            <>
              <div style={{ color: "#000000" }}>bookingId={currentBooking.bookingId}</div>
              <div style={{ color: "#000000" }}>bookingId: {currentBooking.bookingId}</div>
              {currentBooking.heldBy && <div style={{ color: "#000000" }}>held by: {currentBooking.heldBy}</div>}
            </>
          )}
        </div>
      )}

      {seatSnapshot && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: "#000000" }}>Seat Snapshot</h3>
          <div style={{
            backgroundColor: "#f5f5f5",
            padding: "15px",
            borderRadius: 4,
            border: "1px solid #ddd",
            color: "#000000"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 8, fontSize: 13 }}>
              <div style={{ fontWeight: "bold" }}>Seat ID:</div>
              <div>{seatSnapshot.seatId}</div>

              <div style={{ fontWeight: "bold" }}>Status:</div>
              <div>{seatSnapshot.status}</div>

              <div style={{ fontWeight: "bold" }}>Booked By:</div>
              <div>{seatSnapshot.bookedBy || "—"}</div>

              <div style={{ fontWeight: "bold" }}>Booked At:</div>
              <div>{formatDate(seatSnapshot.bookedAt)}</div>

              <div style={{ fontWeight: "bold" }}>Hold Expires At:</div>
              <div>{formatDate(seatSnapshot.holdExpiresAt)}</div>

              <div style={{ fontWeight: "bold" }}>Booking / Hold Id:</div>
              <div>{seatSnapshot.bookingId || seatSnapshot.holdId || "—"}</div>

              <div style={{ fontWeight: "bold" }}>Raw JSON:</div>
              <div style={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", overflow: "auto" }}>{JSON.stringify(seatSnapshot, null, 2)}</div>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ color: "#000000" }}>All Seats</h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(10, 80px)",
        gap: 8,
        marginTop: 10
      }}>
        {seats.map(seat => (
          <button
            key={seat.seatId}
            onClick={() => setSelectedSeat(seat.seatId)}
            style={{
              padding: "10px 5px",
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: "12px",
              backgroundColor:
                seat.status === "AVAILABLE"
                  ? "#d4f8d4"
                  : seat.status === "HELD"
                  ? "#fff3cd"
                  : "#f8d7da",
              color: seat.status === "BOOKED" ? "#721c24" : "#000",
              fontWeight: selectedSeat === seat.seatId ? "bold" : "normal",
              borderWidth: selectedSeat === seat.seatId ? 3 : 1
            }}
          >
            <div style={{ fontWeight: "bold" }}>{seat.seatId}</div>
            <div style={{ fontSize: "10px" }}>{seat.status}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;