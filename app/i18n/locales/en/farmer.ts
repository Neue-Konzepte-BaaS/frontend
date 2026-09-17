export const farmer = {
  dashboardMetaTitle: "Home · BaaS",
  dashboardTitle: "Home",
  dashboardBody: "Manage the fields and land parcels your farm offers for self-harvest rental.",
  yourFieldsTitle: "Your fields",
  yourFieldsBody: "View your fields and land parcels, or draw a new field on the map.",

  fieldsListMetaTitle: "Your fields · BaaS",
  noFieldsYet: "No fields yet — use the plot planner to draw your first one.",
  plot_one: "{{count}} plot",
  plot_other: "{{count}} plots",
  rentedTo: "rented to {{name}}",
  editPlots: "Edit plots",

  newFieldMetaTitle: "Draw a field · BaaS",
  newFieldTitle: "Draw a new field",
  rectangleTooSmall: "That rectangle is too small — try drawing a larger one.",
  fieldNameLabel: "Field name",
  saving: "Saving…",
  saveField: "Save field",
  redraw: "Redraw",
  drawFieldInstructions:
    "Draw a rectangle around your whole field: click one corner, click a second corner to set the angle, then click again to finish. It can be rotated to match your field exactly.",
  nameFieldInstructions:
    "Give your field a name, then save it — or redraw it if the shape isn't right. You'll set up its plots next.",

  fieldDetailMetaTitle: "Field · BaaS",
  fieldHasNoPlotsYet: "This field has no plots yet.",
  invalidRowsColumns: "Rows and columns must both be whole numbers of at least 1.",
  plotGenerationFailed:
    "{{message}} — {{created}} of {{total}} plots were created before this failed. The plots already created cannot be removed from here.",
  gridInstructions:
    "Set how many rows and columns of equal-sized plots to lay out across this field. This can only be done once — there's no way to change it afterwards yet.",
  rowsLabel: "Rows",
  columnsLabel: "Columns",
  creatingPlotProgress: "Creating plot {{done}} of {{total}}…",
  generatePlots: "Generate plots",
  plotsLabel: "Plots",
  selectPlotsInstructions: "Select one or more plots on the map or in this list, then choose what they should offer below.",
  noCropsForPlot: "No crops offered yet",

  offeredCropsLabel: "Crops for the selected plots",
  plotsSelected_one: "{{count}} plot selected.",
  plotsSelected_other: "{{count}} plots selected.",
  noPlotsSelected: "Select a plot above to set what it offers.",
  noCropsInCatalog: "No crops exist in the catalog yet — ask an admin to add some.",
  cropDuration: "{{name}} ({{months}}-month rental)",
  savingCrops: "Saving…",
  saveCrops: "Save",

  mapAriaLabel: "Field map",

  // Nav destinations still awaiting a real feature — see issue #27 and coming-soon.tsx.
  tenantsMetaTitle: "Tenants · BaaS",
  tenantsTitle: "Tenants",
  requestsMetaTitle: "Requests · BaaS",
  requestsTitle: "Requests",
  boardMetaTitle: "Board · BaaS",
  boardTitle: "Board",
  careGuideMetaTitle: "Care guide · BaaS",
  careGuideTitle: "Care guide",
  settingsMetaTitle: "Farm settings · BaaS",
  settingsTitle: "Farm settings",
} as const;
