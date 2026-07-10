import "./handler/wsServer"; // starts WS server
import "./handler/publishListener"; // starts Redis SUBSCRIBE
import { readEngineEmits } from "./handler/engineConsumer";

readEngineEmits().catch(() => process.exit(1));
