/**
 * The 72 microseasons (七十二候, kō) of the Japanese almanac.
 *
 * Source: Nippon.com, "Japan's 72 Microseasons" (2015),
 * https://www.nippon.com/en/features/h00124/ — dates, kanji, romaji and English
 * as published there. The page notes the dates are approximate (they can shift
 * by a day from year to year) and that the readings aren't standardised. We use
 * them as fixed dates: the microseason is a small poem, never used for advice.
 *
 * Index 0 is 東風解凍 (4 February, the start of 立春). Each entry is
 * "MM-DD|kanji|romaji|English".
 */
const RAW = `02-04|東風解凍|Harukaze kōri o toku|East wind melts the ice
02-09|黄鶯睍睆|Kōō kenkan su|Bush warblers start singing in the mountains
02-14|魚上氷|Uo kōri o izuru|Fish emerge from the ice
02-19|土脉潤起|Tsuchi no shō uruoi okoru|Rain moistens the soil
02-24|霞始靆|Kasumi hajimete tanabiku|Mist starts to linger
03-01|草木萌動|Sōmoku mebae izuru|Grass sprouts, trees bud
03-06|蟄虫啓戸|Sugomori mushito o hiraku|Hibernating insects surface
03-11|桃始笑|Momo hajimete saku|First peach blossoms
03-16|菜虫化蝶|Namushi chō to naru|Caterpillars become butterflies
03-21|雀始巣|Suzume hajimete sukū|Sparrows start to nest
03-26|櫻始開|Sakura hajimete saku|First cherry blossoms
03-31|雷乃発声|Kaminari sunawachi koe o hassu|Distant thunder
04-05|玄鳥至|Tsubame kitaru|Swallows return
04-10|鴻雁北|Kōgan kaeru|Wild geese fly north
04-15|虹始見|Niji hajimete arawaru|First rainbows
04-20|葭始生|Ashi hajimete shōzu|First reeds sprout
04-25|霜止出苗|Shimo yamite nae izuru|Last frost, rice seedlings grow
04-30|牡丹華|Botan hana saku|Peonies bloom
05-05|蛙始鳴|Kawazu hajimete naku|Frogs start singing
05-10|蚯蚓出|Mimizu izuru|Worms surface
05-15|竹笋生|Takenoko shōzu|Bamboo shoots sprout
05-21|蚕起食桑|Kaiko okite kuwa o hamu|Silkworms start feasting on mulberry leaves
05-26|紅花栄|Benibana sakau|Safflowers bloom
05-31|麦秋至|Mugi no toki itaru|Wheat ripens and is harvested
06-06|蟷螂生|Kamakiri shōzu|Praying mantises hatch
06-11|腐草為螢|Kusaretaru kusa hotaru to naru|Rotten grass becomes fireflies
06-16|梅子黄|Ume no mi kibamu|Plums turn yellow
06-21|乃東枯|Natsukarekusa karuru|Self-heal withers
06-27|菖蒲華|Ayame hana saku|Irises bloom
07-02|半夏生|Hange shōzu|Crow-dipper sprouts
07-07|温風至|Atsukaze itaru|Warm winds blow
07-12|蓮始開|Hasu hajimete hiraku|First lotus blossoms
07-17|鷹乃学習|Taka sunawachi waza o narau|Hawks learn to fly
07-23|桐始結花|Kiri hajimete hana o musubu|Paulownia trees produce seeds
07-29|土潤溽暑|Tsuchi uruōte mushi atsushi|Earth is damp, air is humid
08-03|大雨時行|Taiu tokidoki furu|Great rains sometimes fall
08-08|涼風至|Suzukaze itaru|Cool winds blow
08-13|寒蝉鳴|Higurashi naku|Evening cicadas sing
08-18|蒙霧升降|Fukaki kiri matō|Thick fog descends
08-23|綿柎開|Wata no hana shibe hiraku|Cotton flowers bloom
08-28|天地始粛|Tenchi hajimete samushi|Heat starts to die down
09-02|禾乃登|Kokumono sunawachi minoru|Rice ripens
09-08|草露白|Kusa no tsuyu shiroshi|Dew glistens white on grass
09-13|鶺鴒鳴|Sekirei naku|Wagtails sing
09-18|玄鳥去|Tsubame saru|Swallows leave
09-23|雷乃収声|Kaminari sunawachi koe o osamu|Thunder ceases
09-28|蟄虫坏戸|Mushi kakurete to o fusagu|Insects hole up underground
10-03|水始涸|Mizu hajimete karuru|Farmers drain fields
10-08|鴻雁来|Kōgan kitaru|Wild geese return
10-13|菊花開|Kiku no hana hiraku|Chrysanthemums bloom
10-18|蟋蟀在戸|Kirigirisu to ni ari|Crickets chirp around the door
10-23|霜始降|Shimo hajimete furu|First frost
10-28|霎時施|Kosame tokidoki furu|Light rains sometimes fall
11-02|楓蔦黄|Momiji tsuta kibamu|Maple leaves and ivy turn yellow
11-07|山茶始開|Tsubaki hajimete hiraku|Camellias bloom
11-12|地始凍|Chi hajimete kōru|Land starts to freeze
11-17|金盞香|Kinsenka saku|Daffodils bloom
11-22|虹蔵不見|Niji kakurete miezu|Rainbows hide
11-27|朔風払葉|Kitakaze konoha o harau|North wind blows the leaves from the trees
12-02|橘始黄|Tachibana hajimete kibamu|Tachibana citrus tree leaves start to turn yellow
12-07|閉塞成冬|Sora samuku fuyu to naru|Cold sets in, winter begins
12-12|熊蟄穴|Kuma ana ni komoru|Bears start hibernating in their dens
12-17|鱖魚群|Sake no uo muragaru|Salmon gather and swim upstream
12-22|乃東生|Natsukarekusa shōzu|Self-heal sprouts
12-27|麋角解|Sawashika no tsuno otsuru|Deer shed antlers
01-01|雪下出麦|Yuki watarite mugi nobiru|Wheat sprouts under snow
01-05|芹乃栄|Seri sunawachi sakau|Parsley flourishes
01-10|水泉動|Shimizu atataka o fukumu|Springs thaw
01-15|雉始雊|Kiji hajimete naku|Pheasants start to call
01-20|款冬華|Fuki no hana saku|Butterburs bud
01-25|水沢腹堅|Sawamizu kōri tsumeru|Ice thickens on streams
01-30|鶏始乳|Niwatori hajimete toya ni tsuku|Hens start laying eggs`;

/** The 24 solar terms (二十四節気); each holds three microseasons in order. */
export const SOLAR_TERMS = [
  ["立春", "Risshun", "Beginning of spring"],
  ["雨水", "Usui", "Rainwater"],
  ["啓蟄", "Keichitsu", "Insects awaken"],
  ["春分", "Shunbun", "Spring equinox"],
  ["清明", "Seimei", "Pure and clear"],
  ["穀雨", "Kokuu", "Grain rain"],
  ["立夏", "Rikka", "Beginning of summer"],
  ["小満", "Shōman", "Lesser ripening"],
  ["芒種", "Bōshu", "Grain in ear"],
  ["夏至", "Geshi", "Summer solstice"],
  ["小暑", "Shōsho", "Lesser heat"],
  ["大暑", "Taisho", "Greater heat"],
  ["立秋", "Risshū", "Beginning of autumn"],
  ["処暑", "Shosho", "End of heat"],
  ["白露", "Hakuro", "White dew"],
  ["秋分", "Shūbun", "Autumn equinox"],
  ["寒露", "Kanro", "Cold dew"],
  ["霜降", "Sōkō", "Frost falls"],
  ["立冬", "Rittō", "Beginning of winter"],
  ["小雪", "Shōsetsu", "Lesser snow"],
  ["大雪", "Taisetsu", "Greater snow"],
  ["冬至", "Tōji", "Winter solstice"],
  ["小寒", "Shōkan", "Lesser cold"],
  ["大寒", "Daikan", "Greater cold"],
].map(([kanji, romaji, english], index) => ({ index, kanji, romaji, english }));

export type SolarTerm = (typeof SOLAR_TERMS)[number];

export interface Microseason {
  /** 0–71, from 東風解凍 (4 Feb). */
  index: number;
  /** Fixed start, "MM-DD". */
  start: string;
  kanji: string;
  romaji: string;
  english: string;
  /** Index into SOLAR_TERMS. */
  term: number;
}

export const MICROSEASONS: Microseason[] = RAW.split("\n").map((line, index) => {
  const [start, kanji, romaji, english] = line.split("|");
  return { index, start, kanji, romaji, english, term: Math.floor(index / 3) };
});

/** "MM-DD" for a date, in local calendar terms. */
export function monthDay(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Position of a "MM-DD" in the almanac year that starts on 4 February (0 = 02-04). */
export function almanacDay(md: string): number {
  const [m, d] = md.split("-").map(Number);
  // Day of year in a leap year (so 29 Feb has a place), shifted to start on 4 Feb.
  const doy = Math.round((Date.UTC(2024, m - 1, d) - Date.UTC(2024, 0, 1)) / 86_400_000);
  const start = 34; // 4 Feb
  return (doy - start + 366) % 366;
}

/** The microseason a date falls in. */
export function microseasonFor(d: Date | string): Microseason {
  const pos = almanacDay(typeof d === "string" ? d : monthDay(d));
  let found = MICROSEASONS[0];
  for (const ms of MICROSEASONS) if (almanacDay(ms.start) <= pos) found = ms;
  return found;
}

/** The last day ("MM-DD") of a microseason: the day before the next one starts. */
export function microseasonEnd(index: number): string {
  const next = MICROSEASONS[(index + 1) % 72].start;
  const [m, d] = next.split("-").map(Number);
  const prev = new Date(Date.UTC(2023, m - 1, d - 1)); // a non-leap year: the fixed calendar
  return `${String(prev.getUTCMonth() + 1).padStart(2, "0")}-${String(prev.getUTCDate()).padStart(2, "0")}`;
}

/** Index of the microseason starting exactly on "MM-DD", or -1. */
export function microseasonStartingOn(md: string): number {
  return MICROSEASONS.findIndex((m) => m.start === md);
}
