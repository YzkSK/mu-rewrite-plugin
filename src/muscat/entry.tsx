import { mountTimetable, unmountTimetable } from "./shell/timetableHost";
import { watchScreen } from "./shell/watchScreen";

// URL は画面遷移後も変わらず、#wrap ごと差し替わるので、見出しの画面コードを見張って出し入れする
watchScreen(document, (code) => (code === "Kmd008" ? mountTimetable() : unmountTimetable()));
