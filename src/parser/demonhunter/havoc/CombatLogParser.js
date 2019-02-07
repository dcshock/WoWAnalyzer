import CoreCombatLogParser from 'parser/core/CombatLogParser';
import DamageDone from 'parser/shared/modules/DamageDone';
import ArcaneTorrent from 'parser/shared/modules/racials/bloodelf/ArcaneTorrent';

import EyeBeamNormalizer from './normalizers/EyeBeam';
import Channeling from './modules/core/Channeling';
import GlobalCooldown from './modules/core/GlobalCooldown';

import AlwaysBeCasting from './modules/features/AlwaysBeCasting';
import Abilities from './modules/Abilities';
import CooldownThroughputTracker from './modules/features/CooldownThroughputTracker';

import Checklist from './modules/features/Checklist/Module';

import Momentum from './modules/spells/Momentum';
import Nemesis from './modules/spells/Nemesis';
import Felblade from './modules/talents/Felblade';
import DemonicAppetite from './modules/talents/DemonicAppetite';
import BlindFury from './modules/talents/BlindFury';

import TrailofRuin from './modules/talents/TrailofRuin';
import FelBarrage from './modules/talents/FelBarrage';
import FelMastery from './modules/talents/FelMastery';

//Resources
import FuryDetails from './modules/resourcetracker/FuryDetails';
import FuryTracker from './modules/resourcetracker/FuryTracker';

//Items
import SoulOfTheSlayer from '../shared/modules/items/SoulOfTheSlayer';

class CombatLogParser extends CoreCombatLogParser {
  static specModules = {
    // Core Statistics
    damageDone: [DamageDone, { showStatistic: true }],
    channeling: Channeling,
    globalCooldown: GlobalCooldown,

    //Normalizer
    eyeBeamNormalizer: EyeBeamNormalizer,

    // Features
    alwaysBeCasting: AlwaysBeCasting,
    abilities: Abilities,
    cooldownThroughputTracker: CooldownThroughputTracker,
    checklist: Checklist,

    // Spells
    momentum: Momentum,
    nemesis: Nemesis,

    //Talents
    felblade: Felblade,
    demonicAppetite: DemonicAppetite,
    blindFury: BlindFury,
    trailofRuin: TrailofRuin,
    felBarrage: FelBarrage,
    felMastery: FelMastery,

    //Resources
    furyTracker: FuryTracker,
    furyDetails: FuryDetails,

    //Items
    soulOfTheSlayer: SoulOfTheSlayer,

    // There's no throughput benefit from casting Arcane Torrent on cooldown
    arcaneTorrent: [ArcaneTorrent, { castEfficiency: null }],
  };
}

export default CombatLogParser;
