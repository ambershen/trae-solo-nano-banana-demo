import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Editor from "@/pages/Editor";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Editor />} />
      </Routes>
    </Router>
  );
}
