import React from "react";
import { render } from "react-dom";

import { HashRouter, Routes, Route } from "react-router-dom";

import App from "./pages/App";
import ReviewVideos from "./pages/ReviewVideos";
import SetupVideos from "./pages/SetupVideos";

render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<SetupVideos />} />
        <Route path="/review" element={<ReviewVideos />} />
      </Route>
    </Routes>
  </HashRouter>,
  document.getElementById("app")
);
