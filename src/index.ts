import { Server } from "./server";
import { ServerMulti } from "./server2";

const server = new Server();
const serverMulti = new ServerMulti();

serverMulti.listen(port => {
  console.log(`Server is listening on http://localhost:${port}`);
});
server.listen(port => {
  console.log(`Server is listening on http://localhost:${port}`);
});
