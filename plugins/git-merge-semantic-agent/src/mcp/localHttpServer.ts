import { CoreMergeWorkflow } from "../application/CoreMergeWorkflow.js";
import { startHttpServer } from "./httpServer.js";

// The real Git/AST workflow stays on the developer's machine. Binding to
// loopback prevents any network client from reading or writing local files.
startHttpServer(new CoreMergeWorkflow(), "127.0.0.1");
