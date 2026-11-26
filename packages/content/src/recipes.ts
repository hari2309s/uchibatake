/**
 * A small set of family recipes keyed to what grows in the field (09). Not
 * growing advice: everyday cooking, written plainly. `field` lists crop ids
 * (from the catalogue); `shop` is everything else.
 */
export interface Recipe {
  id: string;
  name: string;
  /** One line for Home's "For the table this week". */
  line: string;
  serves: number;
  minutes: number;
  field: { crop: string; amount: string }[];
  shop: string[];
  method: string[];
  mottainai?: string;
  /**
   * Which diets it suits, each with what to change ("" = as it is). A diet
   * that isn't listed isn't suggested to a family that keeps it.
   */
  suits: { vegetarian?: string; vegan?: string; "gluten-free"?: string };
}

export const RECIPES: Recipe[] = [
  {
    id: "boerenkool-stamppot",
    name: "Boerenkool stamppot",
    line: "Kale and leeks mashed into potatoes. Enough for the whole family.",
    serves: 6,
    minutes: 40,
    field: [
      { crop: "kale", amount: "a big colander" },
      { crop: "leeks", amount: "two" },
      { crop: "parsley", amount: "a handful" },
    ],
    shop: ["Floury potatoes, 1.5 kg", "Milk and butter", "Mustard, salt, pepper", "Rookworst, for those who want it"],
    method: [
      "Boil the potatoes with the sliced leeks, about 20 minutes.",
      "Strip the kale from its stems and chop it fine.",
      "Drain, mash with warm milk and butter, then stir the kale through.",
      "Make a well for gravy, and scatter the parsley on top.",
    ],
    mottainai: "Save the kale stems and leek tops for tomorrow's soup. Potato peels roast into crisps.",
    suits: { vegetarian: "Leave out the rookworst.", "gluten-free": "Leave out the rookworst, or check its label." },
  },
  {
    id: "broad-bean-garlic-pasta",
    name: "Broad beans, new garlic and basil",
    line: "Pasta tossed with broad beans, fresh garlic and a handful of basil.",
    serves: 6,
    minutes: 25,
    field: [
      { crop: "broad-beans", amount: "a big bowl of pods" },
      { crop: "garlic", amount: "two cloves" },
      { crop: "basil", amount: "a handful" },
    ],
    shop: ["Pasta, 500 g", "Olive oil", "A lemon", "Parmesan, salt, pepper"],
    method: ["Pod the beans. Small ones can stay in their grey skins; slip big ones out after boiling.", "Cook the pasta, adding the beans for the last three minutes.", "Warm the sliced garlic gently in olive oil.", "Toss everything together with lemon, cheese and torn basil."],
    mottainai: "Young bean pods can be sliced and fried like green beans.",
    suits: { vegetarian: "Use a vegetarian hard cheese instead of Parmesan.", "gluten-free": "Use gluten-free pasta." },
  },
  {
    id: "lambs-lettuce-walnuts",
    name: "Lamb's lettuce with walnuts",
    line: "A small winter salad: soft rosettes, walnuts and a sharp dressing.",
    serves: 4,
    minutes: 10,
    field: [{ crop: "lambs-lettuce", amount: "a small bowl" }],
    shop: ["Walnuts, a handful", "Mustard, vinegar, oil", "An apple or pear"],
    method: ["Rinse the rosettes in cold water and dry them gently.", "Toast the walnuts in a dry pan.", "Whisk mustard, vinegar and oil; toss just before eating."],
    suits: { vegetarian: "", vegan: "", "gluten-free": "" },
  },
  {
    id: "spinach-eggs",
    name: "Spinach and eggs",
    line: "A pan of wilted spinach with eggs cooked right in it.",
    serves: 4,
    minutes: 20,
    field: [
      { crop: "spinach", amount: "two big handfuls" },
      { crop: "green-onions", amount: "a few" },
    ],
    shop: ["Eggs, one or two each", "Butter or oil", "Bread for the table"],
    method: ["Soften the sliced green onions in butter.", "Add the spinach and let it wilt down.", "Make little wells and crack the eggs in; cover until set."],
    mottainai: "Thick spinach stems chop into the pan first: they cook a little longer.",
    suits: { vegetarian: "", "gluten-free": "Serve with gluten-free bread." },
  },
  {
    id: "tomato-basil",
    name: "Tomatoes and basil on toast",
    line: "Warm tomatoes, torn basil and good bread. Summer on a plate.",
    serves: 4,
    minutes: 10,
    field: [
      { crop: "tomatoes", amount: "a bowlful" },
      { crop: "basil", amount: "a handful" },
    ],
    shop: ["Good bread", "Olive oil, salt", "A clove of garlic"],
    method: ["Toast the bread and rub it with the cut garlic.", "Halve the tomatoes and salt them.", "Pile them on, tear the basil over, and finish with oil."],
    mottainai: "Stale bread and soft tomatoes make a good panzanella.",
    suits: { vegetarian: "", vegan: "", "gluten-free": "Use gluten-free bread." },
  },
];

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
