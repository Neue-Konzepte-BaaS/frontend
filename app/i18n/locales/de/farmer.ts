import type { farmer as en } from "~/i18n/locales/en/farmer";

type Shape = { [K in keyof typeof en]: string };

export const farmer: Shape = {
  dashboardMetaTitle: "Landwirt-Dashboard · BaaS",
  dashboardTitle: "Landwirt-Dashboard",
  dashboardBody: "Verwalte die Felder und Flurstücke, die dein Hof zur Selbsternte anbietet.",
  yourFieldsTitle: "Deine Felder",
  yourFieldsBody: "Sieh dir deine Felder und Flurstücke an oder zeichne ein neues Feld auf der Karte.",

  fieldsListMetaTitle: "Deine Felder · BaaS",
  addField: "Feld hinzufügen",
  noFieldsYet: "Noch keine Felder — zeichne dein erstes.",
  plot_one: "{{count}} Parzelle",
  plot_other: "{{count}} Parzellen",

  newFieldMetaTitle: "Feld zeichnen · BaaS",
  newFieldTitle: "Neues Feld zeichnen",
  rectangleTooSmall: "Dieses Rechteck ist zu klein — versuche, ein größeres zu zeichnen.",
  fieldNameLabel: "Feldname",
  saving: "Wird gespeichert…",
  saveField: "Feld speichern",
  redraw: "Neu zeichnen",
  drawFieldInstructions:
    "Zeichne ein Rechteck um dein gesamtes Feld: klicke auf eine Ecke, klicke auf eine zweite Ecke, um den Winkel festzulegen, und klicke erneut, um abzuschließen. Es kann gedreht werden, um genau zu deinem Feld zu passen.",
  nameFieldInstructions:
    "Gib deinem Feld einen Namen und speichere es — oder zeichne es neu, wenn die Form nicht stimmt. Als Nächstes richtest du die Parzellen ein.",

  fieldDetailMetaTitle: "Feld · BaaS",
  fieldHasNoPlotsYet: "Dieses Feld hat noch keine Parzellen.",
  invalidRowsColumns: "Zeilen und Spalten müssen beide ganze Zahlen von mindestens 1 sein.",
  plotGenerationFailed:
    "{{message}} — {{created}} von {{total}} Parzellen wurden erstellt, bevor dies fehlschlug. Die bereits erstellten Parzellen können von hier aus nicht entfernt werden.",
  gridInstructions:
    "Lege fest, wie viele Zeilen und Spalten gleich großer Parzellen über dieses Feld gelegt werden sollen. Das ist nur einmal möglich — es gibt noch keine Möglichkeit, es später zu ändern.",
  rowsLabel: "Zeilen",
  columnsLabel: "Spalten",
  creatingPlotProgress: "Parzelle {{done}} von {{total}} wird erstellt…",
  generatePlots: "Parzellen erstellen",
  plotsLabel: "Parzellen",

  mapAriaLabel: "Feldkarte",
};
