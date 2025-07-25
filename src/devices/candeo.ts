import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";
import {assertString} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const manufacturerSpecificClusterCode = 0x1224;
const switchTypeAttribute = 0x8803;
const dataType = 0x20;
const valueMap: {[key: number]: string} = {
    0: "momentary",
    1: "toggle",
};
const valueLookup: {[key: string]: number} = {
    momentary: 0,
    toggle: 1,
};

const luxScale: m.ScaleFunction = (value: number, type: "from" | "to") => {
    let result = value;
    if (type === "from") {
        result = 10 ** ((result - 1) / 10000);
        if (result > 0 && result <= 2200) {
            result = -7.969192 + 0.0151988 * result;
        } else if (result > 2200 && result <= 2500) {
            result = -1069.189434 + 0.4950663 * result;
        } else if (result > 2500) {
            result = 78029.21628 - 61.73575 * result + 0.01223567 * result ** 2;
        }
        result = result < 1 ? 1 : result;
    }
    return result;
};

const fzLocal = {
    switch_type: {
        cluster: "genBasic",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (Object.hasOwn(msg.data, switchTypeAttribute)) {
                const value = msg.data[switchTypeAttribute];
                return {
                    external_switch_type: valueMap[value] || "unknown",
                    external_switch_type_numeric: value,
                };
            }
            return undefined;
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    switch_type: {
        key: ["external_switch_type"],
        convertSet: async (entity, key, value, meta) => {
            assertString(value);
            const numericValue = valueLookup[value] ?? Number.parseInt(value, 10);
            await entity.write(
                "genBasic",
                {[switchTypeAttribute]: {value: numericValue, type: dataType}},
                {manufacturerCode: manufacturerSpecificClusterCode},
            );
            return {state: {external_switch_type: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificClusterCode});
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "C205", manufacturerName: "Candeo"}],
        model: "C205",
        vendor: "Candeo",
        description: "Zigbee switch module",
        extend: [m.onOff()],
        fromZigbee: [fzLocal.switch_type, fz.ignore_genOta],
        toZigbee: [tzLocal.switch_type],
        exposes: [e.enum("external_switch_type", ea.ALL, ["momentary", "toggle"]).withLabel("External switch type")],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint1.read("genOnOff", ["startUpOnOff"]);
            await endpoint1.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificClusterCode});
        },
    },
    {
        zigbeeModel: ["HK-DIM-A", "Candeo Zigbee Dimmer", "HK_DIM_A"],
        fingerprint: [
            {modelID: "Dimmer-Switch-ZB3.0", manufacturerName: "Candeo"},
            {modelID: "HK_DIM_A", manufacturerName: "Shyugj"},
        ],
        model: "C202.1",
        vendor: "Candeo",
        description: "Zigbee LED smart dimmer switch",
        extend: [m.light({configureReporting: true, powerOnBehavior: false})],
    },
    {
        fingerprint: [{modelID: "Dimmer-Switch-ZB3.0", manufacturerID: 4098}],
        model: "C210",
        vendor: "Candeo",
        description: "Zigbee dimming smart plug",
        extend: [m.light({configureReporting: true})],
    },
    {
        fingerprint: [{modelID: "C204", manufacturerName: "Candeo"}],
        model: "C204",
        vendor: "Candeo",
        description: "Zigbee micro smart dimmer",
        extend: [
            m.light({configureReporting: true, levelConfig: {features: ["on_off_transition_time", "on_level", "current_level_startup"]}}),
            m.electricityMeter(),
        ],
        fromZigbee: [fzLocal.switch_type, fz.ignore_genOta],
        toZigbee: [tzLocal.switch_type],
        exposes: [e.enum("external_switch_type", ea.ALL, ["momentary", "toggle"]).withLabel("External switch type")],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint1.read("genOnOff", ["startUpOnOff"]);
            await endpoint1.write("genLevelCtrl", {17: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["onLevel"]);
            await endpoint1.write("genLevelCtrl", {16: {value: 0x0a, type: 0x21}});
            await endpoint1.read("genLevelCtrl", ["onOffTransitionTime"]);
            await endpoint1.write("genLevelCtrl", {16384: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["startUpCurrentLevel"]);
            await endpoint1.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificClusterCode});
        },
    },
    {
        fingerprint: [{modelID: "C-ZB-DM204", manufacturerName: "Candeo"}],
        model: "C-ZB-DM204",
        vendor: "Candeo",
        description: "Zigbee micro smart dimmer",
        extend: [
            m.light({configureReporting: true, levelConfig: {features: ["on_off_transition_time", "on_level", "current_level_startup"]}}),
            m.electricityMeter(),
        ],
        fromZigbee: [fzLocal.switch_type, fz.ignore_genOta],
        toZigbee: [tzLocal.switch_type],
        exposes: [e.enum("external_switch_type", ea.ALL, ["momentary", "toggle"]).withLabel("External switch type")],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint1.read("genOnOff", ["startUpOnOff"]);
            await endpoint1.write("genLevelCtrl", {17: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["onLevel"]);
            await endpoint1.write("genLevelCtrl", {16: {value: 0x0a, type: 0x21}});
            await endpoint1.read("genLevelCtrl", ["onOffTransitionTime"]);
            await endpoint1.write("genLevelCtrl", {16384: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["startUpCurrentLevel"]);
            await endpoint1.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificClusterCode});
        },
    },
    {
        zigbeeModel: ["C202"],
        fingerprint: [
            {modelID: "Candeo Zigbee Dimmer", softwareBuildID: "1.04", dateCode: "20230828"},
            {modelID: "Candeo Zigbee Dimmer", softwareBuildID: "1.20", dateCode: "20240813"},
        ],
        model: "C202",
        vendor: "Candeo",
        description: "Smart rotary dimmer",
        extend: [
            m.light({
                configureReporting: true,
                levelConfig: {features: ["on_level", "current_level_startup"]},
                powerOnBehavior: true,
            }),
        ],
    },
    {
        zigbeeModel: ["C201"],
        model: "C201",
        vendor: "Candeo",
        description: "Smart dimmer module",
        extend: [
            m.light({
                configureReporting: true,
                levelConfig: {features: ["on_level", "current_level_startup"]},
                powerOnBehavior: true,
            }),
        ],
    },
    {
        fingerprint: [{modelID: "C-ZB-LC20-CCT", manufacturerName: "Candeo"}],
        model: "C-ZB-LC20-CCT",
        vendor: "Candeo",
        description: "Smart LED controller (CCT mode)",
        extend: [
            m.light({
                colorTemp: {range: [158, 500]},
                configureReporting: true,
                levelConfig: {
                    features: ["current_level_startup"],
                },
                powerOnBehavior: true,
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: "C-ZB-LC20-Dim", manufacturerName: "Candeo"}],
        model: "C-ZB-LC20-Dim",
        vendor: "Candeo",
        description: "Smart LED controller (dimmer mode)",
        extend: [
            m.light({
                configureReporting: true,
                levelConfig: {
                    features: ["current_level_startup"],
                },
                powerOnBehavior: true,
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: "C-ZB-LC20-RGB", manufacturerName: "Candeo"}],
        model: "C-ZB-LC20-RGB",
        vendor: "Candeo",
        description: "Smart LED controller (RGB mode)",
        extend: [
            m.light({
                color: {modes: ["xy", "hs"], enhancedHue: true},
                configureReporting: true,
                levelConfig: {
                    features: ["current_level_startup"],
                },
                powerOnBehavior: true,
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: "C-ZB-LC20-RGBCCT", manufacturerName: "Candeo"}],
        model: "C-ZB-LC20-RGBCCT",
        vendor: "Candeo",
        description: "Smart LED controller (RGBCCT mode)",
        extend: [
            m.light({
                colorTemp: {range: [158, 500]},
                color: {modes: ["xy", "hs"], enhancedHue: true},
                configureReporting: true,
                levelConfig: {
                    features: ["current_level_startup"],
                },
                powerOnBehavior: true,
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: "C-ZB-LC20-RGBW", manufacturerName: "Candeo"}],
        model: "C-ZB-LC20-RGBW",
        vendor: "Candeo",
        description: "Smart LED controller (RGBW mode)",
        extend: [
            m.light({
                colorTemp: {range: [158, 500]},
                color: {modes: ["xy", "hs"], enhancedHue: true},
                configureReporting: true,
                levelConfig: {
                    features: ["current_level_startup"],
                },
                powerOnBehavior: true,
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: "C-ZB-SM205-2G", manufacturerName: "Candeo"}],
        model: "C-ZB-SM205-2G",
        vendor: "Candeo",
        description: "Smart 2 gang switch module",
        extend: [
            m.deviceEndpoints({
                endpoints: {l1: 1, l2: 2, e11: 11},
                multiEndpointSkip: ["power", "current", "voltage", "energy"],
            }),
            m.onOff({endpointNames: ["l1", "l2"]}),
            m.electricityMeter(),
        ],
        fromZigbee: [fzLocal.switch_type, fz.ignore_genOta],
        toZigbee: [tzLocal.switch_type],
        exposes: [e.enum("external_switch_type", ea.ALL, ["momentary", "toggle"]).withLabel("External switch type").withEndpoint("e11")],
        meta: {},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await endpoint1.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint1.read("genOnOff", [16387]);
            await endpoint2.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint2.read("genOnOff", [16387]);
            const endpoint11 = device.getEndpoint(11);
            await endpoint11.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificClusterCode});
        },
    },
    {
        fingerprint: [{modelID: "C-RFZB-SM1"}],
        model: "C-RFZB-SM1",
        vendor: "Candeo",
        description: "Zigbee & RF Switch Module",
        extend: [m.onOff({powerOnBehavior: true})],
    },
    {
        fingerprint: [
            {modelID: "C203", manufacturerName: "Candeo"},
            {modelID: "HK-LN-DIM-A", manufacturerName: "Candeo"},
        ],
        model: "C203",
        vendor: "Candeo",
        description: "Zigbee micro smart dimmer",
        extend: [m.light({configureReporting: true, levelConfig: {features: ["on_off_transition_time", "on_level", "current_level_startup"]}})],
        fromZigbee: [fzLocal.switch_type, fz.ignore_genOta],
        toZigbee: [tzLocal.switch_type],
        exposes: [e.enum("external_switch_type", ea.ALL, ["momentary", "toggle"]).withLabel("External switch type")],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint1.read("genOnOff", ["startUpOnOff"]);
            await endpoint1.write("genLevelCtrl", {17: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["onLevel"]);
            await endpoint1.write("genLevelCtrl", {16: {value: 0x0a, type: 0x21}});
            await endpoint1.read("genLevelCtrl", ["onOffTransitionTime"]);
            await endpoint1.write("genLevelCtrl", {16384: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["startUpCurrentLevel"]);
            await endpoint1.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificClusterCode});
        },
    },
    {
        fingerprint: [{modelID: "C-ZB-SEWA", manufacturerName: "Candeo"}],
        model: "C-ZB-SEWA",
        vendor: "Candeo",
        description: "Water sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1"]})],
    },
    {
        fingerprint: [{modelID: "C-ZB-SETE", manufacturerName: "Candeo"}],
        model: "C-ZB-SETE",
        vendor: "Candeo",
        description: "Temperature & humidity sensor",
        extend: [m.temperature(), m.humidity(), m.battery()],
    },
    {
        fingerprint: [{modelID: "C-ZB-SEDC", manufacturerName: "Candeo"}],
        model: "C-ZB-SEDC",
        vendor: "Candeo",
        description: "Door contact sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1"]})],
    },
    {
        fingerprint: [{modelID: "C-ZB-SEMO", manufacturerName: "Candeo"}],
        model: "C-ZB-SEMO",
        vendor: "Candeo",
        description: "Motion sensor",
        extend: [
            m.battery(),
            m.illuminance({reporting: {min: 1, max: 65535, change: 1}, scale: luxScale}),
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1"]}),
        ],
    },
    {
        fingerprint: [{modelID: "C-ZB-DM201-2G"}],
        model: "C-ZB-DM201-2G",
        vendor: "Candeo",
        description: "Zigbee 2 gang dimmer module",
        extend: [
            m.deviceEndpoints({
                endpoints: {l1: 1, l2: 2},
            }),
            m.light({
                endpointNames: ["l1", "l2"],
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {features: ["on_level", "current_level_startup"]},
                powerOnBehavior: true,
                effect: false,
            }),
        ],
    },
];
