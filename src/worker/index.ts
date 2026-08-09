import { createApp } from "./app";
import { PlanetScaleNotesRepository } from "./repository";

export default createApp((env) => new PlanetScaleNotesRepository(env.HYPERDRIVE));
