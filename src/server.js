import { ProviderController } from "./controllers/provider_controller";
import { WsProvider } from "./providers/ws/ws_provider";


console.log(process.env);
const provider = new WsProvider();
const controller = new ProviderController(provider);
controller.listen();
