import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { homologationCases, corpusVersion } from "./corpus.js";
import { packetHash, validateCorpus } from "./protocol.js";
import { assembleSpeechAudio, readSpeechReceipt } from "./audio.js";
const args = process.argv.slice(2);
if (args.length !== 1) throw new Error("Informe somente o diretório próprio da síntese local.");
const base = resolve(".local/authoring-homologation/audio"),
  directory = resolve(args[0]!);
if (
  dirname(directory) !== base ||
  !/^run-[a-f0-9]{32}$/u.test(basename(directory)) ||
  (await lstat(directory)).isSymbolicLink() ||
  (await realpath(directory)) !== directory
)
  throw new Error("Diretório de amostra fora do escopo local.");
const receipt = readSpeechReceipt(
  await readFile(join(directory, "utterances.json"), "utf8"),
  validateCorpus(homologationCases)
);
const samples = [];
for (const c of homologationCases.filter((c) => c.input.audioEligible)) {
  const clips = [];
  for (let i = 0; i < c.input.sources.length; i++) {
    const path = join(directory, `${c.id}-${i}.wav`);
    if ((await lstat(path)).isSymbolicLink() || !(await realpath(path)).startsWith(directory + sep))
      throw new Error("Trecho fora do diretório da amostra.");
    clips.push(await readFile(path));
  }
  const audio = assembleSpeechAudio(clips),
    filename = `${c.id}.wav`;
  await writeFile(join(directory, filename), audio.wav, { flag: "wx" });
  samples.push({
    caseId: c.id,
    file: filename,
    mode: c.input.mode,
    inputHash: packetHash(c.input),
    originalSha256: audio.sha256,
    durationSeconds: audio.durationSeconds,
    segments: audio.segments.map((s, i) => ({
      ...s,
      segmentId: c.input.sources[i]!.id,
      text: c.input.sources[i]!.text,
      speaker: null,
      uncertain: false
    }))
  });
}
const manifest = {
  corpusVersion,
  corpusHash: receipt.corpusHash,
  syntheticOnly: true,
  engine: receipt.engine,
  voice: receipt.voice,
  culture: receipt.culture,
  realTranscriberCalls: 0,
  realModelQualityMeasured: false,
  diarizationEvaluated: false,
  samples
};
await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), {
  flag: "wx"
});
await writeFile(
  join(base, "latest.json"),
  JSON.stringify(
    {
      directory,
      manifest: join(directory, "manifest.json"),
      samples: samples.length,
      corpusHash: receipt.corpusHash,
      realTranscriberCalls: 0
    },
    null,
    2
  )
);
process.stdout.write(
  `${samples.length} amostras sintéticas de voz local preparadas; zero transcrições externas.\n`
);
