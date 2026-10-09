/* Shared app state. `run` holds the in-progress playthrough (lost on reload). */
const App = {
  locations: [],
  location: null,        // full record for the open location
  weapons: new Map(),    // id -> weapon
  rarities: {},
  run: null,             // { location, character, owned:[ids], equipped, bossIndex, flasksLeft, phase, drops:[] }
  views: {},             // name -> render(root, params)
};
