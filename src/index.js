import React from "react"
import "./index.css"
import "./bootstrap.min.css"

import { createRoot } from "react-dom/client"
import { AppRouter } from "./routers/AppRouters"

const root = createRoot(document.getElementById("root"))
root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)
