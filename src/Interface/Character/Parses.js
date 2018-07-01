import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import fetchWcl from 'common/fetchWcl';
import ActivityIndicator from 'Interface/common/ActivityIndicator';
import WarcraftLogsLogo from 'Interface/Images/WarcraftLogs-logo.png';
import ArmoryLogo from 'Interface/Images/Armory-logo.png';
import WipefestLogo from 'Interface/Images/Wipefest-logo.png';

import ZONES from 'common/ZONES';
import SPECS from 'common/SPECS';
import DIFFICULTIES from 'common/DIFFICULTIES';
import ITEMS from 'common/ITEMS';

import './Parses.css';
import ParsesList from './ParsesList';

const loadRealms = () => import('common/REALMS').then(exports => exports.default);

//rendering 400+ parses takes quite some time
const RENDER_LIMIT = 100;

const ORDER_BY = {
  DATE: 0,
  DPS: 1,
  PERCENTILE: 2,
};
const ZONE_DEFAULT_ANTORUS = 17;
const BOSS_DEFAULT_ALL_BOSSES = 0;
const TRINKET_SLOTS = [12, 13];
const ERRORS = {
  CHARACTER_NOT_FOUND: 'We couldn\'t find your character on Warcraft Logs',
  NO_PARSES_FOR_TIER: 'We couldn\'t find any logs',
  CHARACTER_HIDDEN: 'We could find your character but he\'s very shy',
  UNEXPECTED: 'Something went wrong',
};

class Parses extends React.Component {
  static propTypes = {
    region: PropTypes.string.isRequired,
    realm: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      specs: [],
      class: '',
      activeSpec: [],
      activeDifficulty: DIFFICULTIES,
      activeZoneID: ZONE_DEFAULT_ANTORUS,
      activeEncounter: BOSS_DEFAULT_ALL_BOSSES,
      sortBy: ORDER_BY.DATE,
      metric: 'dps',
      image: null,
      parses: [],
      isLoading: true,
      error: null,
      trinkets: ITEMS,
    };

    this.updateDifficulty = this.updateDifficulty.bind(this);
    this.updateSpec = this.updateSpec.bind(this);

    this.load = this.load.bind(this);
    this.changeParseStructure = this.changeParseStructure.bind(this);
    this.iconPath = this.iconPath.bind(this);
    this.updateZoneMetricBoss = this.updateZoneMetricBoss.bind(this);
  }

  componentDidMount() {
    this.fetchBattleNetInfo();
  }

  iconPath(specName) {
    return `/specs/${this.state.class.replace(' ', '')}-${specName.replace(' ', '')}.jpg`;
  }

  updateZoneMetricBoss(zone, metric, boss) {
    this.setState({
      activeZoneID: zone,
      metric: metric,
      activeEncounter: boss,
    }, () => {
      this.load();
    });
  }

  updateDifficulty(diff) {
    let newDiff = this.state.activeDifficulty;
    if (newDiff.includes(diff)) {
      newDiff = newDiff.filter(elem => elem !== diff);
    } else {
      newDiff = [...newDiff, diff];
    }

    this.setState({
      activeDifficulty: newDiff,
    });
  }

  updateSpec(spec) {
    let newSpec = this.state.activeSpec;
    if (newSpec.includes(spec)) {
      newSpec = newSpec.filter(elem => elem !== spec);
    } else {
      newSpec = [...newSpec, spec];
    }

    this.setState({
      activeSpec: newSpec,
    });
  }

  get filterParses() {
    let filteredParses = this.state.parses;
    filteredParses = filteredParses
      .filter(elem => this.state.activeDifficulty.includes(elem.difficulty))
      .filter(elem => this.state.activeSpec.includes(elem.spec))
      .sort((a, b) => {
        if (this.state.sortBy === ORDER_BY.DATE) {
          return b.start_time - a.start_time;
        } else if (this.state.sortBy === ORDER_BY.DPS) {
          return b.persecondamount - a.persecondamount;
        }
        return b.historical_percent - a.historical_percent;
      });

    if (Number(this.state.activeEncounter) === BOSS_DEFAULT_ALL_BOSSES) {
      return filteredParses.slice(0, RENDER_LIMIT);
    }

    filteredParses = filteredParses.filter(elem => elem.name === this.state.activeEncounter);

    return filteredParses.slice(0, RENDER_LIMIT);
  }

  changeParseStructure(rawParses, charClass) {
    const updatedTrinkets = { ...this.state.trinkets };
    const parses = rawParses.map(elem => {

      // get missing trinket-icons later
      TRINKET_SLOTS.forEach(slotID => {
        if (!updatedTrinkets[elem.gear[slotID].id]) {
          updatedTrinkets[elem.gear[slotID].id] = {
            name: elem.gear[slotID].name,
            id: elem.gear[slotID].id,
            icon: ITEMS[0].icon,
            quality: elem.gear[slotID].quality,
          };
        }
      });

      return {
        name: elem.encounterName,
        spec: elem.spec,
        difficulty: DIFFICULTIES[elem.difficulty],
        report_code: elem.reportID,
        report_fight: elem.fightID,
        historical_percent: 100 - (elem.rank / elem.outOf * 100),
        persecondamount: elem.total,
        start_time: elem.startTime,
        character_name: elem.characterName,
        talents: elem.talents,
        gear: elem.gear,
        advanced: Object.values(elem.talents).filter(talent => talent.id === 0).length === 0 ? true : false,
      };
    });

    Object.values(updatedTrinkets).map(trinket => {
      if (trinket.icon === ITEMS[0].icon && trinket.id !== 0) {
        return fetch(`https://eu.api.battle.net/wow/item/${trinket.id}?locale=en_GB&apikey=n6q3eyvqh2v4gz8t893mjjgxsf9kjdgz`)
          .then(response => response.json())
          .then((data) => {
            updatedTrinkets[trinket.id].icon = data.icon;
            this.setState({
              trinkets: updatedTrinkets,
            });
          });
      }
      return null;
    });

    return parses;
  }

  get zoneBosses() {
    return ZONES.find(zone => zone.id === this.state.activeZoneID).encounters;
  }

  async fetchBattleNetInfo() {
    // fetch character image and active spec from battle-net
    const response = await fetch(`https://${this.props.region}.api.battle.net/wow/character/${encodeURIComponent(this.props.realm)}/${encodeURIComponent(this.props.name)}?locale=en_GB&fields=talents&apikey=n6q3eyvqh2v4gz8t893mjjgxsf9kjdgz`);
    const data = await response.json();

    if (data.status === 'nok') {
      this.setState({
        isLoading: false,
        error: ERRORS.CHARACTER_NOT_FOUND,
      });
      return;
    }
    if (!data.thumbnail) {
      this.setState({
        isLoading: false,
        error: ERRORS.UNEXPECTED,
      });
      return;
    }
    const image = data.thumbnail.replace('-avatar.jpg', '');
    const role = data.talents.find(e => e.selected).spec.role;
    const metric = role === 'HEALING' ? 'hps' : 'dps';
    this.setState({
      image: image,
      metric: metric,
    }, () => {
      this.load();
    });
  }

  async load(refresh = false) {
    this.setState({
      isLoading: true,
    });

    const realms = await loadRealms();
    //use the slug from REALMS when available, otherwise try realm-prop and fail
    // TODO: Can we make this return results more reliably?
    const realmsInRegion = realms[this.props.region];
    const lowerCaseRealm = this.props.realm.toLowerCase();
    const realm = realmsInRegion ? realmsInRegion.find(elem => elem.name.toLowerCase() === lowerCaseRealm) : null;
    if (!realm) {
      console.warn('Realm could not be found: ' + this.props.realm + '. This generally indicates a bug.');
    }
    const realmSlug = realm ? realm.slug : this.props.realm;

    const urlEncodedName = encodeURIComponent(this.props.name);
    const urlEncodedRealm = encodeURIComponent(realmSlug);

    return fetchWcl(`parses/character/${urlEncodedName}/${urlEncodedRealm}/${this.props.region}`, {
      metric: this.state.metric,
      zone: this.state.activeZoneID,
      timeframe: 'historical',
      _: refresh ? +new Date() : undefined,
    })
      .then(rawParses => {
        if (rawParses.status === 400) {
          this.setState({
            isLoading: false,
            error: ERRORS.CHARACTER_NOT_FOUND,
          });
          return;
        }

        if (rawParses.length === 0) {
          this.setState({
            parses: [],
            isLoading: false,
            error: ERRORS.NO_PARSES_FOR_TIER,
          });
          return;
        }

        if (rawParses.hidden) {
          this.setState({
            isLoading: false,
            error: ERRORS.CHARACTER_HIDDEN,
          });
          return;
        }

        if (this.state.class !== '') { //only update parses when class was already parsed (since its only a metric/raid change)
          const parses = this.changeParseStructure(rawParses, this.state.class);
          this.setState({
            parses: parses,
            error: null,
            isLoading: false,
          });
          return;
        }

        const charClass = rawParses[0].class;
        const specs = Object.values(SPECS)
          .filter(e => e.className === charClass)
          .filter((item, index, self) => self.indexOf(item) === index)
          .map(e => e.specName);

        const parses = this.changeParseStructure(rawParses, charClass);
        this.setState({
          specs: specs,
          activeSpec: specs.map(elem => elem.replace(' ', '')),
          class: charClass,
          parses: parses,
          isLoading: false,
          error: null,
        });
      })
      .catch(e => {
        this.setState({
          error: ERRORS.UNEXPECTED,
          isLoading: false,
        });
      });
  }

  render() {
    let errorMessage;
    if (this.state.error === ERRORS.CHARACTER_NOT_FOUND) {
      errorMessage = (
        <div style={{ padding: 20 }}>
          Please check your input and make sure that you've selected the correct region and realm.<br />
          If your input was correct, then make sure that someone in your raid logged the fight for you or check <a href="https://www.warcraftlogs.com/help/start/" target="_blank" rel="noopener noreferrer">Warcraft Logs guide</a> to get started with logging on your own.<br /><br />
          When you know for sure that you have logs on Warcraft Logs and you still get this error, please message us on <a href="https://discord.gg/AxphPxU" target="_blank" rel="noopener noreferrer">Discord</a> or create an issue on <a href="https://github.com/WoWAnalyzer/WoWAnalyzer" target="_blank" rel="noopener noreferrer">Github</a>.
        </div>
      );
    } else if (this.state.error === ERRORS.CHARACTER_HIDDEN) {
      errorMessage = (
        <div style={{ padding: 20 }}>
          This character is hidden on warcraftlogs and we can't access the parses.<br /><br />
          You don't know how to make your character visible again? Check <a href="https://www.warcraftlogs.com/help/hidingcharacters/" target="_blank" rel="noopener noreferrer">Warcraft Logs </a> and hit the 'Refresh' button above once you're done.
        </div>
      );
    } else if (this.state.error === ERRORS.UNEXPECTED) {
      errorMessage = (
        <div style={{ padding: 20 }}>
          Something unexpected happened.<br /><br />
          Please message us on <a href="https://discord.gg/AxphPxU" target="_blank" rel="noopener noreferrer">Discord</a> or create an issue on <a href="https://github.com/WoWAnalyzer/WoWAnalyzer" target="_blank" rel="noopener noreferrer">Github</a> and we will fix it, eventually.
        </div>
      );
    } else if (this.state.error === ERRORS.NO_PARSES_FOR_TIER || this.filterParses.length === 0) {
      errorMessage = (
        <div style={{ padding: 20 }}>
          Please check your filters and make sure that you logged those fights on Warcraft Logs.<br /><br />
          You don't know how to log your fights? Check <a href="https://www.warcraftlogs.com/help/start/" target="_blank" rel="noopener noreferrer">Warcraft Logs guide</a> to get startet.
        </div>
      );
    }

    return (
      <div className="container charparse">
        <div className="flex-main">
          <div className="col-md-5">
            <div className="panel">
              <div className="row filter">
                <div className="col-md-12" style={{ marginBottom: 20, position: 'relative', height: 280 }}>
                  {this.state.image && (
                    <div className="char-image">
                      <img
                        src={`https://render-${this.props.region}.worldofwarcraft.com/character/${this.state.image}-main.jpg`}
                        alt={'Character render of ' + this.props.name}
                        onError={e => this.setState({ image: null })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                  <h2 style={{ fontSize: '1.8em', marginTop: 10 }}>{this.props.region} - {this.props.realm}</h2>
                  <h2 style={{ fontSize: '2.4em', margin: '10px 10px' }}>
                    {this.props.name}
                  </h2>
                  {this.state.class && (
                    <img
                      src={`/specs/${this.state.class}-New.png`}
                      alt={`Class icon of ${this.state.class}s`}
                      style={{ height: 50, position: 'absolute', right: 12, top: 10 }}
                    />
                  )}
                </div>
                <div className="col-md-4">
                  Specs:
                  {this.state.specs.map((elem, index) => (
                    <div
                      key={index}
                      onClick={() => this.updateSpec(elem.replace(' ', ''))}
                      className={this.state.activeSpec.includes(elem.replace(' ', '')) ? 'selected form-control' : 'form-control'}
                    >
                      <img src={this.iconPath(elem)} style={{ height: 18, marginRight: 10 }} alt="Icon" />
                      {elem}
                    </div>
                  ))}
                </div>

                <div className="col-md-4">
                  Difficulties:
                  {DIFFICULTIES.filter(elem => elem).map((elem, index) => (
                    <div
                      key={index}
                      onClick={() => this.updateDifficulty(elem)}
                      className={this.state.activeDifficulty.includes(elem) ? 'selected form-control' : 'form-control'}
                    >
                      {elem}
                    </div>
                  ))}
                </div>
                <div className="col-md-4">
                  Raid:
                  <select
                    className="form-control"
                    value={this.state.activeZoneID}
                    onChange={e => this.updateZoneMetricBoss(Number(e.target.value), this.state.metric, BOSS_DEFAULT_ALL_BOSSES)}
                  >
                    {Object.values(ZONES).reverse().map(elem =>
                      <option key={elem.id} value={elem.id}>{elem.name}</option>
                    )}
                  </select>
                  Boss:
                  <select
                    className="form-control"
                    value={this.state.activeEncounter}
                    onChange={e => this.setState({ activeEncounter: e.target.value })}
                  >
                    <option value={BOSS_DEFAULT_ALL_BOSSES} defaultValue>All bosses</option>
                    {this.zoneBosses.map(e =>
                      <option key={e.id} value={e.name}>{e.name}</option>
                    )}
                  </select>
                  Metric:
                  <select
                    className="form-control"
                    value={this.state.metric}
                    onChange={e => this.updateZoneMetricBoss(this.state.activeZoneID, e.target.value, this.state.activeEncounter)}
                  >
                    <option defaultValue value="dps">DPS</option>
                    <option value="hps">HPS</option>
                  </select>
                  Sort by:
                  <select
                    className="form-control"
                    value={this.state.sortBy}
                    onChange={e => this.setState({ sortBy: Number(e.target.value) })}
                  >
                    <option defaultValue value={ORDER_BY.DATE}>Date</option>
                    <option value={ORDER_BY.DPS}>DPS / HPS</option>
                    <option value={ORDER_BY.PERCENTILE}>Percentile</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <a
                href={`https://www.warcraftlogs.com/character/${this.props.region}/${this.props.realm}/${this.props.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ fontSize: 22 }}
              >
                <img src={WarcraftLogsLogo} alt="Warcraft Logs logo" style={{ height: '1.4em', marginTop: '-0.15em' }} /> Warcraft Logs
              </a>
              <a
                href={`https://worldofwarcraft.com/en-${this.props.region}/character/${this.props.realm}/${this.props.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ fontSize: 22 }}
              >
                <img src={ArmoryLogo} alt="Armory logo" style={{ height: '1.4em', marginTop: '-0.15em' }} /> Armory
              </a>
              <a
                href={`https://www.wipefest.net/character/${this.props.name}/${this.props.realm}/${this.props.region}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ fontSize: 22 }}
              >
                <img src={WipefestLogo} alt="Wipefest logo" style={{ height: '1.4em', marginTop: '-0.15em' }} /> Wipefest
              </a>
            </div>
          </div>
          <div className="col-md-7">
            {this.state.error && (
              <span>
                <Link to="/">
                  Home
                </Link> &gt;{' '}
                <span>
                  {this.props.region}  &gt; {this.props.realm}  &gt; {this.props.name}
                </span>
                <br /><br />
              </span>
            )}
            <div className="panel" style={{ overflow: 'auto' }}>
              <div className="flex-main">
                {this.state.isLoading && !this.state.error && (
                  <div style={{ textAlign: 'center', fontSize: '2em', margin: '20px 0' }}>
                    <ActivityIndicator text="Fetching logs..." />
                  </div>
                )}
                {!this.state.isLoading && (
                  <div className="panel-heading">
                    <h2 style={{ display: 'inline' }}>{this.state.error ? this.state.error : 'Parses'}</h2>
                    <Link
                      to=""
                      className="pull-right"
                      onClick={e => {
                        e.preventDefault();
                        this.load(true);
                      }}
                    >
                      <span className="glyphicon glyphicon-refresh" aria-hidden="true" /> Refresh
                    </Link>
                  </div>
                )}
                {!this.state.isLoading && errorMessage}
                {!this.state.isLoading && (
                  <ParsesList
                    parses={this.filterParses}
                    class={this.state.class}
                    metric={this.state.metric}
                    trinkets={this.state.trinkets}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Parses;