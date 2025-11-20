module.exports = {
    'corrupted_earth_titan': {
        id: 'corrupted_earth_titan',
        name: 'Corrupted Earth Titan',
        description: 'A colossal titan of rock and blighted earth, awakened by The Withering. It threatens to shatter the very foundations of the region.',
        baseHp: 50000,
        baseAtk: 500,
        baseDef: 800,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1414336406049783808/image-removebg-preview_41.png?ex=68bf32ec&is=68bde16c&hm=2a025a723c26b5ef8982cd862d6bf52f98dd4bd8865a70045d5956bd9d45163f&',
        spawnConditions: {
            timeOfDay: ['day', 'night']
        },
        rewardTiers: {
            top_10: {
                gold: 5000,
                xp: 2500,
                items: [{ itemId: 'beast_egg', quantity: 2 }]
            },
            top_25_percent: {
                gold: 2000,
                xp: 1000,
                items: [{ itemId: 'elemental_egg', quantity: 1 }]
            },
            participant: {
                gold: 500,
                xp: 300,
                items: [{ itemId: 'beast_egg', quantity: 1 }]
            }
        },
        finalBlowReward: {
            gold: 1000,
            items: [{ itemId: 'titan_core', quantity: 1 }]
        }
    },
    'solar_flare_phoenix': {
        id: 'solar_flare_phoenix',
        name: 'Solar Flare Phoenix',
        description: 'A majestic phoenix wreathed in solar fire, it only appears when the sun is at its highest, drawing power from its rays.',
        baseHp: 40000,
        baseAtk: 650,
        baseDef: 600,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1412752882612179024/download.png?ex=68b97026&is=68b81ea6&hm=9f4e963567722c5e547bc29136f1d21aeb1b13b3fc980a5285490e882ddeb7e3&',
        spawnConditions: {
            timeOfDay: ['day'] 
        },
        rewardTiers: {
            top_10: {
                gold: 6000,
                xp: 3000,
                items: [
                    { itemId: 'celestial_fragment', quantity: 3 },
                    { itemId: 'aeonic_egg', quantity: 1 }
                ]
            },
            top_25_percent: {
                gold: 2500,
                xp: 1200,
                items: [
                    { itemId: 'fire_bloom', quantity: 1 },
                    { itemId: 'aeonic_egg', quantity: 1 }
                ]
            },
            participant: {
                gold: 600,
                xp: 400,
                items: [{ itemId: 'aeonic_egg', quantity: 1 }]
            }
        },
        finalBlowReward: {
            gold: 1200,
            items: [{ itemId: 'solar_ash', quantity: 1 }]
        }
    },
    'umbral_leviathan': {
        id: 'umbral_leviathan',
        name: 'Umbral Leviathan',
        description: 'A serpent of pure shadow that slithers out from the darkest realms when the moon hangs high, devouring light and hope.',
        baseHp: 60000,
        baseAtk: 450,
        baseDef: 900,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1412752883530727546/image-removebg-preview_16.png?ex=68b97027&is=68b81ea7&hm=97cb22f48e7421149e0d5b66c614a4c3853fee07f9d5b560d407d98970e17efe&',
        spawnConditions: {
            timeOfDay: ['night']
        },
        rewardTiers: {
            top_10: {
                gold: 4000,
                xp: 2000,
                items: [{ itemId: 'abyssal_egg', quantity: 2 }]
            },
            top_25_percent: {
                gold: 1800,
                xp: 900,
                items: [
                    { itemId: 'nightmare_orb', quantity: 1 },
                    { itemId: 'abyssal_egg', quantity: 1 }
                ]
            },
            participant: {
                gold: 450,
                xp: 250,
                items: [{ itemId: 'abyssal_egg', quantity: 1 }]
            }
        },
        finalBlowReward: {
            gold: 900,
            items: [{ itemId: 'void_scale', quantity: 1 }] 
        }
    }
};