import type { Plaque } from '../floors/floor';

// Plaque text. Tags: q = Qur'an, h = hadith, t = classical commentary (tafsir), n = note about this toybox.
// Qur'an lines are paraphrased, not quoted translations. Verse numbers follow the standard Hafs numbering.

export const RIM_PLAQUE: Plaque = {
  title: 'The Seven Gates',
  lead: 'A cartoon allegory, not a picture of anyone’s real fate.',
  entries: [
    {
      tag: 'q',
      head: 'Seven gates · Qur’an 15:43–44',
      body: 'The Qur’an says that Jahannam has seven gates, and that each gate has its own assigned portion of people.',
    },
    {
      tag: 't',
      head: 'Seven names, seven layers',
      body: 'Explaining that verse, some classical commentators (in works such as those of al-Tabari, al-Qurtubi and Ibn Kathir) matched the gates to names and descriptions of the Fire found in the Qur’an: Jahannam, Laza, al-Hutamah, al-Sa’ir, Saqar, al-Jahim and al-Hawiyah. The stacked order comes from commentary and reported sayings, not from the verse itself, and the lists differ between scholars.',
    },
    {
      tag: 'q',
      head: 'Why everyone regrows · Qur’an 4:56',
      body: 'The verse speaks of renewal within the punishment, so that it never simply ends. This toybox turns that into instant cartoon regrowth: a puff, a whoosh, and “Not again!”',
    },
    {
      tag: 'n',
      head: 'Why critters',
      body: 'No people, prophets or angels are shown. The critters stand in for souls, and their “sins” are petty household mischief chosen to be silly, not to judge anyone.',
    },
  ],
};

export const GATE1_PLAQUE: Plaque = {
  title: 'Gate 1 · Jahannam',
  lead: 'The uppermost gate, and the Qur’an’s most common name for the Fire.',
  entries: [
    {
      tag: 'q',
      head: 'The name',
      body: 'Jahannam is used throughout the Qur’an (for example 15:43) as the general name of the Fire. In the layered lists it is also the name of the top layer.',
    },
    {
      tag: 't',
      head: 'Who is here, in the commentaries',
      body: 'Many of the classical layered lists assign this top layer to sinful believers, whose stay is described as temporary.',
    },
    {
      tag: 'h',
      head: 'Brought out again',
      body: 'Hadith on intercession in Sahih al-Bukhari and Sahih Muslim describe people being taken out of the Fire through God’s mercy, down to whoever has the smallest trace of faith. Scholars linked these reports to the top layer.',
    },
    {
      tag: 'q',
      head: 'Boiling water · Qur’an 55:43–44',
      body: 'The Qur’an describes the deniers moving between the Fire and hamim, scalding water heated to the utmost.',
    },
    {
      tag: 'n',
      head: 'About the cauldron',
      body: 'The stewpot, ladle and popping lid are this toybox’s slapstick stand-in for hamim. They are not scriptural images.',
    },
  ],
};

const GATE2: Plaque = {
  title: 'Gate 2 · Laza',
  lead: 'A leaping flame that calls back whoever runs.',
  entries: [
    {
      tag: 'q',
      head: 'Qur’an 70:15–18',
      body: 'Laza is described as a blazing flame that strips away (nazza‘atan lish-shawa), and that calls to whoever turned their back and walked away, and to whoever gathered wealth and hoarded it.',
    },
    {
      tag: 't',
      head: 'What is stripped',
      body: 'Commentators differ on shawa: the scalp, the skin of the head, the limbs or the extremities are all offered. Here it becomes a cartoon coat that pops off and grows back.',
    },
    {
      tag: 'n',
      head: 'About the hoarder',
      body: 'Verse 18 mentions those who gathered and hoarded. Boba, the snack hoarder, takes that personally.',
    },
  ],
};

const GATE3: Plaque = {
  title: 'Gate 3 · al-Hutamah',
  lead: '“The Crusher.”',
  entries: [
    {
      tag: 'q',
      head: 'Qur’an 104:4–9',
      body: 'The slanderer who piles up wealth will be flung into al-Hutamah: a kindled fire that rises over the hearts, closed in over them in outstretched columns.',
    },
    {
      tag: 't',
      head: 'The name',
      body: 'Hutamah comes from a root meaning to break or crush to pieces. Commentators read it as a fire that shatters whatever is thrown in.',
    },
    {
      tag: 'n',
      head: 'About the press',
      body: 'The stomping press, the accordion walls and the paper rugs are this toybox’s slapstick reading of “crusher”, not a description from the text.',
    },
  ],
};

const GATE4: Plaque = {
  title: 'Gate 4 · al-Sa’ir',
  lead: '“The Blaze”, and the tree that grows from the bottom of it.',
  entries: [
    {
      tag: 'q',
      head: 'Sa’ir · Qur’an 4:10, 67:5–11',
      body: 'Those who unjustly consume the property of orphans are only taking fire into their bellies, and they will burn in a Blaze. In 67:10–11 the people of al-Sa’ir admit that, had they listened, they would not be among them.',
    },
    {
      tag: 'q',
      head: 'The Zaqqum tree · Qur’an 37:62–66',
      body: 'A tree that grows from the root of the Fire, whose fruit the people there eat until their bellies are full. It is also mentioned in 44:43–46 and 56:52.',
    },
    {
      tag: 'n',
      head: 'About the feeding',
      body: 'Fire-breath, frantic hopping and fireball burps are cartoon inventions. Putting the Zaqqum tree in al-Sa\u2019ir is this toybox\u2019s choice, not a classical assignment.',
    },
  ],
};

const GATE5: Plaque = {
  title: 'Gate 5 · Saqar',
  lead: '“It leaves nothing, and spares nothing.”',
  entries: [
    {
      tag: 'q',
      head: 'Qur’an 74:26–30',
      body: 'Saqar is described as leaving nothing and sparing nothing, scorching the skin, with nineteen set over it.',
    },
    {
      tag: 'q',
      head: 'Dragged on their faces · Qur’an 54:48',
      body: 'On that Day they will be dragged into the Fire on their faces and told to taste the touch of Saqar.',
    },
    {
      tag: 'q',
      head: 'The nineteen · Qur’an 74:31',
      body: 'The next verse says the keepers of the Fire are angels, and that their number is a test. Angels are never drawn here, so the nineteen are just quiet lanterns.',
    },
    {
      tag: 'n',
      head: 'About the conveyor',
      body: 'The belt, the crank and the ticket machine are toybox inventions.',
    },
  ],
};

const GATE6: Plaque = {
  title: 'Gate 6 · al-Jahim',
  lead: 'Al-Jahim means a fierce blaze. This floor goes the other way: biting cold.',
  entries: [
    {
      tag: 'q',
      head: 'The name',
      body: 'Al-Jahim is one of the Qur’an’s frequent names for the Fire (for example 2:119, 37:23, 79:36–39).',
    },
    {
      tag: 'h',
      head: 'Two breaths',
      body: 'A hadith in Sahih al-Bukhari and Sahih Muslim says the Fire complained to its Lord and was allowed two breaths, one in winter and one in summer: the fiercest heat you feel and the bitterest cold (zamharir) you feel.',
    },
    {
      tag: 'q',
      head: 'Zamharir · Qur’an 76:13',
      body: 'The word zamharir appears in the Qur’an in the description of Paradise, whose people see neither scorching sun nor bitter cold. Some early commentators also explained ghassaq in 78:25 as a freezing cold.',
    },
    {
      tag: 'n',
      head: 'About the ice',
      body: 'The frozen pillar, ice cubes, mallet and icicles are cartoon props. The idea of a punishing cold comes from hadith and commentary, not from a named “frozen layer” in the Qur’an.',
    },
  ],
};

const GATE7: Plaque = {
  title: 'Gate 7 · al-Hawiyah',
  lead: '“The Abyss.” The deepest gate in the layered lists.',
  entries: [
    {
      tag: 'q',
      head: 'Qur’an 101:8–11',
      body: 'Whoever’s scales are light, their refuge is Hawiyah, a raging fire. The word suggests a pit one falls headlong into.',
    },
    {
      tag: 'q',
      head: 'The lowest depth · Qur’an 4:145',
      body: 'The hypocrites will be in the lowest depth (al-dark al-asfal) of the Fire. In the layered lists that is the bottom gate.',
    },
    {
      tag: 'h',
      head: 'Seventy years',
      body: 'A report in Sahih Muslim tells of a loud sound heard by the Prophet’s companions, explained as a stone thrown into the Fire seventy years earlier that had only just reached its bottom.',
    },
    {
      tag: 'q',
      head: 'Aghlal',
      body: 'Iron collars or shackles (aghlal) are mentioned in several places, for example 13:5, 34:33 and 76:4. Here they are just weights you clip on.',
    },
  ],
};

export const GATE_PLAQUES: Record<number, Plaque> = { 1: GATE1_PLAQUE, 2: GATE2, 3: GATE3, 4: GATE4, 5: GATE5, 6: GATE6, 7: GATE7 };
