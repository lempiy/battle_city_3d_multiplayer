import { ProviderController } from "./controllers/provider_controller";
import { LocalProvider } from "./providers/local/local_provider";

const localProvider = new LocalProvider(self);
const controller = new ProviderController(localProvider);
controller.listen();
