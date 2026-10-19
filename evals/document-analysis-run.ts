// Compatibilidade com o executor anterior: uma única bateria canônica evita
// contar cenários catalogados como se fossem verificações executadas.
import { runDocumentaryQualitySuite } from "./documentary-quality/run.js";

process.stdout.write(`${JSON.stringify(await runDocumentaryQualitySuite(), null, 2)}\n`);
