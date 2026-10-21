// A row in the site header or one of its menus: 44 px tall, with a focus ring that shows in both
// themes. In its own module so server components can use it too (a client module's exports reach
// them only as references).
export const menuItem =
  "flex min-h-11 items-center rounded-lg px-3 font-medium hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-current dark:hover:bg-white/10";
