import React, { useState } from 'react';
import './App.css'; 

// --- FIXED CONFIGURATION ---
// ⚠️ We use ONLY the local proxy URL here. 
// The local-cors-proxy is already configured to point to https://psu.instructure.com
const CORS_PROXY = "http://localhost:8010/proxy"; 

function App() {
  const [token, setToken] = useState(localStorage.getItem('canvas_token') || '');
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  // --- GAMIFICATION STATS ---
  const [stats, setStats] = useState({
    lockedBuds: 0,
    completion: 0,
    upcoming: 0
  });

  // --- FETCHER ---
  const fetchData = async (apiToken) => {
    setLoading(true);
    setError(null);
    const headers = { Authorization: `Bearer ${apiToken}` };

    try {
      // 1. GET USER
      const userRes = await fetch(`${CORS_PROXY}/api/v1/users/self`, { headers });
      if (!userRes.ok) throw new Error("Failed to login. Check token.");
      const user = await userRes.json();
      setUserData(user);

      // 2. GET ACTIVE COURSES
      const coursesRes = await fetch(
        `${CORS_PROXY}/api/v1/courses?enrollment_state=active&include[]=total_scores&per_page=50`, 
        { headers }
      );
      const coursesData = await coursesRes.json();
      setCourses(coursesData);

      // 3. GET ASSIGNMENTS
      const assignmentPromises = coursesData.map(async (course) => {
        try {
          const assignRes = await fetch(
            `${CORS_PROXY}/api/v1/courses/${course.id}/assignments?include[]=submission&order_by=due_at&per_page=50`,
            { headers }
          );
          if (!assignRes.ok) return [];
          const assignData = await assignRes.json();
          // Tag them with course name so we know where they came from
          return assignData.map(a => ({ ...a, course_name: course.name }));
        } catch (e) {
          return [];
        }
      });

      const results = await Promise.all(assignmentPromises);
      const allAssignments = results.flat();
      
      console.log("Assignments found:", allAssignments); 
      setAssignments(allAssignments);
      calculatePoints(coursesData, allAssignments);

    } catch (err) {
      console.error(err);
      setError(err.message + " (Check console for network details)");
    } finally {
      setLoading(false);
    }
  };

  // --- POINT LOGIC ---
  const calculatePoints = (courseList, assignList) => {
    let totalGrade = 0;
    let gradedCourses = 0;

    courseList.forEach(c => {
      if (c.enrollments && c.enrollments[0] && c.enrollments[0].computed_current_score) {
        totalGrade += c.enrollments[0].computed_current_score;
        gradedCourses++;
      }
    });

    const averageGrade = gradedCourses > 0 ? (totalGrade / gradedCourses) : 0;
    
    // Check if assignment is submitted
    const completedCount = assignList.filter(a => 
      (a.submission && a.submission.submitted_at) || a.has_submitted_submissions
    ).length;
    
    // Calculate Score
    const calculatedScore = Math.floor((averageGrade * 10) + (completedCount * 50));
    
    // Count Upcoming
    const upcomingCount = assignList.filter(a => {
        if (!a.due_at) return true;
        return new Date(a.due_at) > new Date();
    }).length;

    setStats({
      lockedBuds: calculatedScore,
      completion: Math.floor((completedCount / (assignList.length || 1)) * 100),
      upcoming: upcomingCount
    });
  };

  // --- DEMO DATA ---
  const loadDemoData = () => {
    setDemoMode(true);
    setUserData({ name: "Demo Student", avatar_url: "" });
    
    const fakeCourses = [
      { id: 1, name: "Advanced React 101", enrollments: [{ computed_current_score: 92 }] }, // > 85 (Show)
      { id: 2, name: "Intro to Botany", enrollments: [{ computed_current_score: 85 }] },    // = 85 (Show)
      { id: 3, name: "Calculus II", enrollments: [{ computed_current_score: 78 }] }         // < 85 (Hide)
    ];
    setCourses(fakeCourses);

    const fakeAssignments = [
      { id: 1, name: "Final Project", due_at: new Date(Date.now() + 86400000).toISOString(), course_name: "Advanced React 101", has_submitted_submissions: false },
      { id: 2, name: "Photosynthesis Essay", due_at: new Date(Date.now() - 86400000).toISOString(), course_name: "Intro to Botany", has_submitted_submissions: true },
      { id: 3, name: "Derivatives Quiz", due_at: null, course_name: "Calculus II", has_submitted_submissions: false },
    ];
    setAssignments(fakeAssignments);
    calculatePoints(fakeCourses, fakeAssignments);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    localStorage.setItem('canvas_token', token);
    fetchData(token);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🔒 Locked Buds</h1>
        {userData && <div className="user-profile"><span>Welcome, {userData.name}</span></div>}
      </header>

      {!userData && !demoMode ? (
        <div className="login-container">
          <h2>Connect to Canvas</h2>
          <p>Generate a "New Access Token" in Canvas Settings.</p>
          <p style={{fontSize: "0.8rem", color: "#666"}}>*Requires local proxy running</p>
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              placeholder="Paste Canvas Token Here..." 
              value={token} 
              onChange={(e) => setToken(e.target.value)} 
            />
            <button type="submit" disabled={loading}>{loading ? "Unlocking..." : "Login"}</button>
          </form>
          {error && <p className="error">{error}</p>}
          <div className="divider">OR</div>
          <button className="secondary-btn" onClick={loadDemoData}>Try Demo Mode</button>
        </div>
      ) : (
        <div className="dashboard">
          <section className="stats-row">
            <div className="card score-card">
              <h3>Locked Buds</h3>
              <div className="big-number">{stats.lockedBuds} 🌿</div>
              <p>Score</p>
            </div>
            <div className="card">
              <h3>Completion</h3>
              <div className="big-number">{stats.completion}%</div>
              <p>Done</p>
            </div>
            <div className="card">
              <h3>Upcoming</h3>
              <div className="big-number">{stats.upcoming}</div>
              <p>To Do</p>
            </div>
          </section>

          <div className="main-content">
            {/* ASSIGNMENTS LIST */}
            <section className="list-section">
              <h2>📅 Upcoming Assignments</h2>
              {assignments.length === 0 ? <p>No assignments found.</p> : (
                <ul>
                  {assignments
                    .filter(a => {
                       if (!a.due_at) return true; 
                       return new Date(a.due_at) >= new Date();
                    })
                    .sort((a, b) => {
                       if (!a.due_at) return 1;
                       if (!b.due_at) return -1;
                       return new Date(a.due_at) - new Date(b.due_at);
                    })
                    .slice(0, 10)
                    .map(a => (
                    <li key={a.id} className="list-item">
                      <div className="item-info">
                        <strong>{a.name}</strong>
                        <span className="course-tag">{a.course_name}</span>
                      </div>
                      <div className="item-date">
                        {a.due_at ? new Date(a.due_at).toLocaleDateString() : "No Due Date"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* CLASS LIST (FILTERED FOR > 85%) */}
            <section className="list-section">
              <h2>📚 Your Classes</h2>
              <div className="course-grid">
                {courses
                  .filter(c => {
                    // Safety check: Make sure grade data exists first
                    const grade = c.enrollments?.[0]?.computed_current_score;
                    // Filter: Only return true if grade exists and is >= 85
                    return grade && grade >= 85;
                  })
                  .map(c => (
                    <div key={c.id} className="course-card">
                      <h4>{c.name}</h4>
                      {c.enrollments && c.enrollments[0] && (
                        <div className="grade-badge">
                          Current Grade: {c.enrollments[0].computed_current_score || 'N/A'}%
                        </div>
                      )}
                    </div>
                ))}
                
                {/* Optional: Message if nothing matches */}
                {courses.length > 0 && courses.filter(c => c.enrollments?.[0]?.computed_current_score >= 85).length === 0 && (
                  <p style={{fontStyle: 'italic', color: '#666'}}>No classes with a grade of 85% or higher found.</p>
                )}
              </div>
            </section>
          </div>
          
          <button className="logout-btn" onClick={() => {
            setUserData(null); 
            setDemoMode(false); 
            localStorage.removeItem('canvas_token');
          }}>Log Out</button>
        </div>
      )}
    </div>
  );
}

export default App;