function retailRecognition(input) {
  const ctx = buildContext(input);

  if (ctx.furniture) {
    return pick([
      "That room has been asking for help",
      "You can only look at that couch for so long",
      "At some point the whole room starts leaning on you",
    ]);
  }

  return pick([
    "That part happens fast",
    "You can feel it when the setup is done",
    "Soon enough, the whole thing starts to look tired",
  ]);
}

function retailProblem(input) {
  const ctx = buildContext(input);

  if (ctx.furniture) {
    return pick([
      "Sooner or later the room is due",
      "At some point the old couch has had its say",
      "Once you see it, you cannot unsee it",
    ]);
  }

  return pick([
    "At some point the old setup is just in the way",
    "Sooner or later the room is due",
    "Once you see it, you cannot unsee it",
  ]);
}
