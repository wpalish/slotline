import {
  F,
  S,
  R,
  C,
  live,
  rows,
  byId,
  unique,
  required,
  minor,
  amount,
  interval,
  noOverlap,
  changed,
  immutable,
  admin,
  totalLines,
  summary,
  clock,
  label,
} from "./core/rules.js";
const definition = {
  slug: "slotline",
  reference: 71,
  title: "SlotLine",
  description:
    "Расписание услуг сотрудников с вычислением окончания и запретом пересечений, включая буфер.",
  limitations:
    "Одна организация · Собственный сервер · Ручной ввод · Без банковских и внешних интеграций",
  collections: [
    C("services", "Услуги", [
      F("name", "Услуга"),
      F("minutes", "Длительность, минут", "integer", { min: 5, max: 480 }),
      F("buffer", "Буфер после, минут", "integer", { max: 120 }),
    ]),
    C("staff", "Сотрудники", [F("name", "Сотрудник или ресурс")]),
    C("bookings", "Записи", [
      R("service", "Услуга", "services"),
      R("staff", "Сотрудник", "staff"),
      F("visitor", "Обозначение клиента без личных документов"),
      F("start", "Начало", "datetime", {
        placeholder: "2026-10-25T10:00:00+05:00",
      }),
      S("status", "Состояние", [
        ["booked", "Записан"],
        ["cancelled", "Отменён"],
      ]),
    ]),
  ],
  validate(state, before, command, actor) {
    unique(live(state, "staff"), "name", "Сотрудник");
    for (const b of rows(state, "bookings")) {
      const service = byId(state, "services", b.service),
        staff = byId(state, "staff", b.staff);
      if (b.status === "booked" && Date.parse(b.end) > Date.now()) {
        const previous = changed(before, "bookings", b.id);
        required(
          !b.archived || previous?.archived,
          "Сначала отмените запись или дождитесь окончания интервала перед архивированием.",
        );
        required(
          !staff.archived && !service.archived,
          "Для активной записи нужны действующие услуга и сотрудник.",
        );
      }
      required(
        b.end ===
          new Date(
            Date.parse(b.start) +
              (service.minutes + service.buffer) * 60000,
          ).toISOString(),
        "Изменение длительности затрагивает сохранённые записи. Создайте новую услугу.",
      );
    }
    noOverlap(
      rows(state, "bookings"),
      "staff",
      "start",
      "end",
      (x) => x.status === "booked",
    );
  },
  summarize(state) {
    return rows(state, "bookings").map((b) =>
      summary(
        b.visitor + " · " + byId(state, "staff", b.staff).name,
        "Начало: " + clock(b.start),
        "Конец с буфером: " + clock(b.end, b.start),
        "Статус: " +
          label(definition, "bookings", "status", b.status) +
          ". Время указано в выбранном часовом поясе.",
      ),
    );
  },
  normalizeRow(key, row, state) {
    if (key === "bookings") {
      const service = byId(state, "services", row.service);
      row.end = new Date(
        Date.parse(row.start) + (service.minutes + service.buffer) * 60000,
      ).toISOString();
    }
    return row;
  },
};
export default definition;
