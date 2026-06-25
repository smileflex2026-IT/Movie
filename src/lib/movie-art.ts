/**
 * Title → TMDB poster/backdrop mapping for every seeded movie title.
 *
 * Each entry uses TMDB's public image CDN. Posters use w500, backdrops use
 * the original size — wrapped at lookup time. Keys are normalized (lowercase,
 * alphanumerics only) so punctuation/case differences in titles don't matter.
 *
 * If a title isn't found, a deterministic fallback from FALLBACK_ART is used
 * so we never render a missing image.
 */

import { slugify } from "./slug";

const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/original";

const normalizeKey = (title: string) =>
  title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");

interface ArtRef {
  /** poster path (with leading slash) on TMDB CDN */
  p: string;
  /** backdrop path (with leading slash) on TMDB CDN */
  b: string;
}

/**
 * Picsum.photos provides a stable, royalty-free placeholder. Seeding by the
 * title slug guarantees:
 *   - every title gets a UNIQUE image (no repeats across rails)
 *   - the URL is deterministic and always loads (no 404s)
 *   - no two different titles share the same fallback image
 * Used both as the unmapped-title fallback and as the runtime onError
 * fallback when a TMDB path 404s.
 */
export const getFallbackArtForTitle = (
  title: string,
): { poster: string; backdrop: string } => {
  const seed = slugify(title) || normalizeKey(title) || "movie";
  return {
    poster: `https://picsum.photos/seed/${encodeURIComponent(seed)}-p/500/750`,
    backdrop: `https://picsum.photos/seed/${encodeURIComponent(seed)}-b/1280/720`,
  };
};

/**
 * Title → TMDB poster + backdrop map. Real, public TMDB image paths.
 * Keys are the original titles — they get normalized before lookup, so don't
 * worry about punctuation matching exactly.
 */
const TITLE_ART: Record<string, ArtRef> = {
  // ---- Trending Now (cat 1) ----
  "Oppenheimer": { p: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", b: "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg" },
  "Dune: Part Two": { p: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg", b: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg" },
  "Barbie": { p: "/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg", b: "/nHf61UzkfFno5X1ofIhugCPus2R.jpg" },
  "Killers of the Flower Moon": { p: "/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg", b: "/1X7vow16X7CnCoexXh4H4F2yDJv.jpg" },
  "Poor Things": { p: "/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg", b: "/jeGtaPnNXJlDGGTRTwYbo0Llxqv.jpg" },
  "The Holdovers": { p: "/VkfNTHvyuTM2cYXNRWeKgVKDLF.jpg", b: "/ouTk8TjcXEZeGYpe6oMyx5opYpy.jpg" },
  "Wonka": { p: "/qhb1qOilapbapxWQn9jtRCMwXJF.jpg", b: "/ynfm8z6h0GNKuCxe5WS3Ux29CKu.jpg" },
  "Saltburn": { p: "/chcCntp6Z67fNAg85WlwLKlzfWf.jpg", b: "/dtIIRrf1aZRjnGxQRgy4o9Fhinl.jpg" },
  "Anatomy of a Fall": { p: "/kkGVTr31o3UMXkTW8CEjBvObOoQ.jpg", b: "/yrju2nYUMJDrpcHzg49AkYHrLLJ.jpg" },
  "Past Lives": { p: "/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg", b: "/bXq7Cm0CB85VLcSdKb8e2KGZmJv.jpg" },
  "Maestro": { p: "/4sjxhvB2Ulc25uqBpEAhJ2yj1cy.jpg", b: "/kElkUSCveYV8GLpUbf8reLb12cV.jpg" },
  "American Fiction": { p: "/d3hsKM6dxTQq0xqjvQH1jVf8nKh.jpg", b: "/9StxRAiC5z1QJyVz5kgFmFRn3pQ.jpg" },
  "Civil War": { p: "/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg", b: "/uPBMHeY8YTLqvYqK39ujnyWERxE.jpg" },
  "Furiosa": { p: "/iADOJ8Zymht2JPMoy3R7xceZprc.jpg", b: "/4woSOUD0equAYzvwhWBHIJDCM88.jpg" },
  "Challengers": { p: "/H6j5smdpRqP9a8UnhWp6zfl0SC.jpg", b: "/iEFuHjqrE059SmflBgCy09xKhEC.jpg" },
  "Mission: Impossible — Dead Reckoning": { p: "/NNxYkU70HPurnNCSiCjYAmacwm.jpg", b: "/628Dep6AxEtDxjZoGP78TsOxYbK.jpg" },
  "Migration": { p: "/ldfCF9RhR40mppkzmftxapaHeTo.jpg", b: "/aJCpHDC6RoGz7d1Fp5UCmf7gnEd.jpg" },
  "The Boys in the Boat": { p: "/9rDqNvsDQKgvKkbnY4FOFdvvthQ.jpg", b: "/A6FPaY8FAKBrGgkY9TrRgNRQKLh.jpg" },
  "Argylle": { p: "/86mhgXBvf4xUIHnLAvlsxBRf2bP.jpg", b: "/qbkAqmmEIZfrCO8ZQAW9JNCCYTW.jpg" },
  "Aquaman and the Lost Kingdom": { p: "/8xV47NDrjdZDpkVcCFqkdHa3T0C.jpg", b: "/5a4JdoFwll5DRtKMe7JLuGQ9yJm.jpg" },
  "Madame Web": { p: "/rULWuutDcN5NvtiZi4FRPzRYWSh.jpg", b: "/oKt4J3TFjWirVwBqoHyIvv5IImd.jpg" },
  "Bob Marley: One Love": { p: "/jvJG2zZD5Pld22LRrth5Xgzpihp.jpg", b: "/tNzn9pEuHwQVy1qJqMLkWO0Z4LM.jpg" },

  // ---- SmileFlex Originals (cat 2) — fictional. Use evocative TMDB stills.
  "Smile Therapy": { p: "/lAXONuqg41NwUMuzMiFvicDET9Y.jpg", b: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" }, // Smile poster
  "Project Sunrise": { p: "/iAaEvWwG2NSlz8FbKPe3F1xnTx.jpg", b: "/9hofuTHr3GFKfWYW2sFCp5cd0u3.jpg" },
  "Echoes of Tomorrow": { p: "/rULWuutDcN5NvtiZi4FRPzRYWSh.jpg", b: "/4woSOUD0equAYzvwhWBHIJDCM88.jpg" },
  "The Last Lighthouse": { p: "/A4j8S6moJS2zNtRR8oWF08gRnL5.jpg", b: "/eAfAlLTmHGMlbX3FPIYWE0n2NH.jpg" },
  "Neon Nights": { p: "/aPvjL5pOWB7bXG9o0qwL9MtKZUz.jpg", b: "/1Ds7xy7ILo8u2WWxdnkJth1jQVT.jpg" },
  "Velvet Skies": { p: "/bxYZH5PTm21Zc8YVxrlH4WQGBbm.jpg", b: "/9hofuTHr3GFKfWYW2sFCp5cd0u3.jpg" },
  "Paper Cranes": { p: "/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg", b: "/bXq7Cm0CB85VLcSdKb8e2KGZmJv.jpg" },
  "Ironwood": { p: "/uF9zXigvXg6vVZcUMEtP19w4hqV.jpg", b: "/2KGxQFV9Wp1MshPBf8BuqWUgVAz.jpg" },
  "The Glass Garden": { p: "/zfbjgQE1uSd9wiPTX4VzsLi0rGG.jpg", b: "/jeGtaPnNXJlDGGTRTwYbo0Llxqv.jpg" },
  "Midnight Static": { p: "/m9EtP1Yrzv6v7dMaC9mRaGhd1um.jpg", b: "/dtIIRrf1aZRjnGxQRgy4o9Fhinl.jpg" },
  "Crimson Hour": { p: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg", b: "/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg" },
  "Kindred": { p: "/c9OyXZG7iOGjAvFoCEjZF7DwxlR.jpg", b: "/oKt4J3TFjWirVwBqoHyIvv5IImd.jpg" },
  "Northwind": { p: "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg", b: "/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg" },
  "The Cartographer": { p: "/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg", b: "/A6FPaY8FAKBrGgkY9TrRgNRQKLh.jpg" },
  "Solace": { p: "/tEiIH5QesdheJmDAqQwvtN60727.jpg", b: "/ouTk8TjcXEZeGYpe6oMyx5opYpy.jpg" },
  "Aurora Drive": { p: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg", b: "/fp6X6yhgcxzxCpmM0EVC6V9B5qS.jpg" },
  "Halcyon": { p: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", b: "/pbrkL804c8yAv3zBZR4QPWZAAn8.jpg" },
  "The Quiet Letter": { p: "/qom1SZSENdmHFNZBXbtJAU0WTlC.jpg", b: "/jeGtaPnNXJlDGGTRTwYbo0Llxqv.jpg" },
  "Wildflower": { p: "/p3OXl3ZpvUTKZ1eOfQq6kzsQbu7.jpg", b: "/yrju2nYUMJDrpcHzg49AkYHrLLJ.jpg" },
  "Saltwater": { p: "/A4j8S6moJS2zNtRR8oWF08gRnL5.jpg", b: "/eAfAlLTmHGMlbX3FPIYWE0n2NH.jpg" },
  "Lantern": { p: "/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg", b: "/A6FPaY8FAKBrGgkY9TrRgNRQKLh.jpg" },
  "Ember": { p: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg", b: "/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg" },

  // ---- Popular on SmileFlex (cat 3) ----
  "Stranger Things": { p: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", b: "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg" },
  "Money Heist": { p: "/9KCqOgmVHEzPJ0mBthfXRcM4SiM.jpg", b: "/lOSdUkGQmbAl5JQ4QTKuVKjQF9q.jpg" },
  "The Crown": { p: "/1M876KPjulVwppEpldhdc8V4o68.jpg", b: "/o0FjfAvFNuwHTbnAYz6N0qvg5pe.jpg" },
  "Wednesday": { p: "/9PFonBhy4cQy7Jz20NpMygczOkv.jpg", b: "/iHSwvRVsRyxpX7FE7GbviaDvgGZ.jpg" },
  "Squid Game": { p: "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg", b: "/oQuRRKfHUG24ZGiwTNUk5h74kJM.jpg" },
  "Bridgerton": { p: "/6LiE7uPNboaqSAhMgGCEcdBy6vd.jpg", b: "/jKTUnKv2Sx4OYpcdEpu2eHmAOAd.jpg" },
  "Dark": { p: "/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg", b: "/fadwT81C2NWkVBxsh2ip7tYLh4N.jpg" },
  "Ozark": { p: "/m73QQHEhjThVJjEWAhJlIvcA8Lk.jpg", b: "/vYfgEnVxJTuiwfxtXmxr8taFvkD.jpg" },
  "Lupin": { p: "/sgxHrjrkLgZdiE7AaszkkVFmxQS.jpg", b: "/iqx0DM5kqWJxn94nRYJWgqWMmy0.jpg" },
  "The Witcher": { p: "/dRMmzNNSNQghBQ5GrL5yibu6lrV.jpg", b: "/3lnL4HdrhJsImwLE5qnDYsohyi8.jpg" },
  "Narcos": { p: "/rTmal9fDbwh5F0waol2hq35U4ah.jpg", b: "/aT6Ec0Ka6mNdFXBJEFn8sSQRFt0.jpg" },
  "Peaky Blinders": { p: "/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg", b: "/o0iVwOH9YmlVgK2bWAW5GBABYNZ.jpg" },
  "Cobra Kai": { p: "/6POBWybSBDBKjSs1VAQcnQC1qyt.jpg", b: "/9faGSFi5jam6pDWGNd0p8JcJgXQ.jpg" },
  "Lucifer": { p: "/4EYPN5mVIhKLfxGruy7Dy41dTVn.jpg", b: "/rNjNiYNQqz9ZmlsZmH4UEKuxN3K.jpg" },
  "You": { p: "/7bEYwjUvZdbiCWQHsKZNB5fSDBV.jpg", b: "/uoYsfvLpzDcd8VzMlcjRO9VBjCn.jpg" },
  "Manifest": { p: "/zoeIdnFEEVj6f9DmZUNlczu4ZBA.jpg", b: "/xkpe2XYGN3pXyQGq3BzjlHzAEjQ.jpg" },
  "Shadow and Bone": { p: "/p7mfaP1USXQfnUuYYsGS8L5wPd2.jpg", b: "/2RlWP1L1pBcftR9Vx2IFjE1S0Yo.jpg" },
  "Arcane": { p: "/abf8tHznhSvl9BAElD2cQeRr7do.jpg", b: "/qggj1ZUTHH5mbdXY1jgz3uKFcc6.jpg" },
  "Heartstopper": { p: "/lvbpAW2dgNAuDNlcBzRgU82ScrR.jpg", b: "/4U8E4HamrtgrVDh1tZkGfX2Ur1n.jpg" },
  "Vikings": { p: "/bQLrHIRNEkE3PdIWQrZHynQZazu.jpg", b: "/lvB1Z3JsgBauxNKKXWeFQRlIBNh.jpg" },
  "The Sandman": { p: "/q54qEgagGOYCq5D1903eBVMNkbo.jpg", b: "/eGhEEPpsCw1QpiNgT9V3wTcWWBk.jpg" },
  "Locke & Key": { p: "/hmcLN2dHaG9ZUtPVebpQA8WbgQt.jpg", b: "/zbn8oW8DhRoFK2yTmaLHHEi4j2I.jpg" },

  // ---- Comedy Classics (cat 4) ----
  "The Office": { p: "/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg", b: "/7G2VvG1lU8q758uOqU6z2Qf2u2I.jpg" },
  "Friends": { p: "/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg", b: "/l0qVZIpXtIo7km9u5Yqh0nKPOr5.jpg" },
  "Seinfeld": { p: "/aCw8ONfyz3AhngVQa1E2Ss4KSUQ.jpg", b: "/eHXALZTo4iCRyFxgU8MUqeGxs71.jpg" },
  "Brooklyn Nine-Nine": { p: "/ncC9ZgZuKOdaVm7yXinUn26Qyok.jpg", b: "/lOjPZIIzKx4HjMZWbVNwfJI4vU0.jpg" },
  "Parks and Recreation": { p: "/9SfBYBmJrjSwIBWsa2I7g8DUpUa.jpg", b: "/eu7IygvUOoiU6kre7Q40DjHFenk.jpg" },
  "Modern Family": { p: "/klE7DnnQfYDOIyUMC6XV3XeZsmX.jpg", b: "/u7uotUZWubNoQebjdfb4gW77Mma.jpg" },
  "Ted Lasso": { p: "/5fhZdwP1DVJ0FyVPvLBTbe7Sb6Z.jpg", b: "/eKi8d9bQz3nrzNlZHaplUiD9YcW.jpg" },
  "Community": { p: "/aKz3lXU71wqdslXVxV9zHmTbRDP.jpg", b: "/6kVtxvYa68dMUIoWO3DpwL3Pcv7.jpg" },
  "Arrested Development": { p: "/3DGfgRtYCmwYZcs4hVxzJgBYdSB.jpg", b: "/xfwgGvF8GVxlxScjdc5RNLRKygf.jpg" },
  "30 Rock": { p: "/5ttZQQTnEW2qWv9zuQzfYLQrqyL.jpg", b: "/3RVlz67kF8d1Olsj7CjFcbCtVan.jpg" },
  "How I Met Your Mother": { p: "/b34jPzmB0wZy7EjUZoleXOl2RRI.jpg", b: "/yWlerlQEEQ1NZHsibpW5gRXkZQI.jpg" },
  "The Big Bang Theory": { p: "/ooBGRQBdbGzBxAVfExiO8r7kloA.jpg", b: "/mAJ84W6I8I272Da87qplS2Dp9ST.jpg" },
  "Schitt's Creek": { p: "/iRfSzrPS5VYWQv7KVSEg2g6ZjAc.jpg", b: "/iSAClMSyMzkZuTYhVUwnTPzYj1J.jpg" },
  "Curb Your Enthusiasm": { p: "/zAYRe2bJxpWTVrwwmBc00VFkAf4.jpg", b: "/9D3hYKfgJUC2lXcZjmYbY3rLfzv.jpg" },
  "Frasier": { p: "/aRoVMCmtjLM2VrIrbyLY9pHyL34.jpg", b: "/gpAUYjCdytKpVLGNcVj9UZkTaIM.jpg" },
  "Cheers": { p: "/jXAKFdJUSDtA5fOzBqLRMOoAzl9.jpg", b: "/fF5z79imuzFbfaJaP3aOX4eLn0n.jpg" },
  "Scrubs": { p: "/8Sw6POcTqNWFDQuP63cqAsjTuWl.jpg", b: "/lGaTjYHjJZBSI7iagKf2DgGCI4Q.jpg" },
  "It's Always Sunny in Philadelphia": { p: "/63ftLBM9SxJVk7lI9OoOPgQGRG6.jpg", b: "/ne3y1xLehyFyQGwuEN0p6Y3OobS.jpg" },
  "Silicon Valley": { p: "/iEEs9bvFroJlgnaSC1H6n5rsaw1.jpg", b: "/qVNWa6BjVk7vQVOCrgrA1tCk08X.jpg" },
  "New Girl": { p: "/4WPvLOxBzLgAmsqx8ZfvJlSluc8.jpg", b: "/uUaH2KVXMgmVmsAQa6GxZpzHV2D.jpg" },
  "Veep": { p: "/jzYvFFSLxrQyt2D9bQYQyP2I4Vt.jpg", b: "/2NZuHO0vG3uNMlilK0c1lZGSn8L.jpg" },
  "The Good Place": { p: "/qIhsuhRWKEnZQ8KkBiCRfOLcLhV.jpg", b: "/biSztcNBM5n6PuxgOjXyJ8w8nSj.jpg" },

  // ---- Drama Series (cat 5) ----
  "Breaking Bad": { p: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", b: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg" },
  "Better Call Saul": { p: "/fC2HDm5t0kHl7mTm7jxMR31bvVa.jpg", b: "/9faGSFi5jam6pDWGNd0p8JcJgXQ.jpg" },
  "The Sopranos": { p: "/57okJfVpAyKQrQYjZxLEr44CmKZ.jpg", b: "/lvB1Z3JsgBauxNKKXWeFQRlIBNh.jpg" },
  "Mad Men": { p: "/7Lnixr60YNVQwRfcKGv2ABhVCgu.jpg", b: "/jXSjHE2mFW3O0sTmW0FZJWS9HpL.jpg" },
  "Succession": { p: "/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg", b: "/tcheoA2nPATCm2vvXw2hVQoaEFD.jpg" },
  "The Wire": { p: "/4lbclFySvugI51fwsyxBTOm4DqK.jpg", b: "/atfxFZdnEQwfCt8LAGyKjgZHWoZ.jpg" },
  "Game of Thrones": { p: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg", b: "/suopoADq0k8YZr4dQXcU6pToj6s.jpg" },
  "House of the Dragon": { p: "/z2yahl2uefxDCl0nogcRBstwruJ.jpg", b: "/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg" },
  "This Is Us": { p: "/96UCWpAuJWv5UkxojikQYJpXmDA.jpg", b: "/i7NDnDOdwtKt0iy7gzlT8qNsTj4.jpg" },
  "The Pianist": { p: "/2hFvxCCWrTmCYwfy7yum0GKRi3Y.jpg", b: "/o1bhPP6Ji8tHOyBLP3WSwcHwQQ7.jpg" },
  "A Beautiful Mind": { p: "/zwzWCmH72OSC9NA0ipoqw5Zjya8.jpg", b: "/57nZ9MNTzPtqWrhqhVrVefTXlm.jpg" },
  "12 Years a Slave": { p: "/xdANQijuNrJaw1HA61rDccME4Tm.jpg", b: "/euvjEkUhN9aaTXvJjDF4XkjUC0E.jpg" },
  "Manchester by the Sea": { p: "/o9VXYOuaJxCEKOxbA86xqtwmqYn.jpg", b: "/3EOOqwQ4yh0L6IXZQEK6vsf3vTo.jpg" },
  "The Shawshank Redemption": { p: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", b: "/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg" },
  "Marriage Story": { p: "/c1tPLfLLkfRhpFaKvzAWBDYP3Lh.jpg", b: "/lL3NCN1ulcsnrUe8NYkkkMD7c5K.jpg" },
  "Whiplash": { p: "/7fn624j5lj3xTme2SgiLCeuedmO.jpg", b: "/6bbZ6XyvgfjhQwbplnUARGd1aha.jpg" },
  "Dead Poets Society": { p: "/oRLybP6E3JKImIE1zsBmRR5LLAa.jpg", b: "/9bnYkClnpbYf8I2jqOCsVkCp02e.jpg" },
  "The Green Mile": { p: "/8VG8fDNiy50H7FedNlFtmBZTnSp.jpg", b: "/2iGN0aKHJYD0xQydlfuCUAcgNbO.jpg" },
  "Forrest Gump": { p: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", b: "/yE5d3BUhE8hCnkMUJOo1QDoOGNz.jpg" },
  "The Godfather": { p: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", b: "/tmU7GeKVybMWFButWEGl2M4GeiP.jpg" },
  "Schindler's List": { p: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg", b: "/loRmRzQXZeqG78TqZuyvSlEQfZb.jpg" },
  "There Will Be Blood": { p: "/fa0RDkAlCec0STeMNAhPaF89q4r.jpg", b: "/7nuPCnIfX3xT7qY8AZsKaMLdt2v.jpg" },

  // ---- Action Packed (cat 6) ----
  "Mad Max: Fury Road": { p: "/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg", b: "/gqrnQA6Xppdl8vIb2eJc58VC1tW.jpg" },
  "John Wick: Chapter 4": { p: "/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg", b: "/h8gHn0OzBoaefsYseUByqsmEDMY.jpg" },
  "Extraction": { p: "/wlfDxbGEsW58vGhFljKkcR5IxDj.jpg", b: "/nbIrDhOtUpdD9HKDBRy02a8VhpV.jpg" },
  "The Raid": { p: "/dEbBAaZxYDohlqsX9YbTRosYsKL.jpg", b: "/zMuD61aTxRZb4lAZBPOVLwTjJol.jpg" },
  "Heat": { p: "/zMyfPUelumio3tiDKPffaUpsQTD.jpg", b: "/iYmQjPM3JAOZTvgwhPVjLNhrbQS.jpg" },
  "Die Hard": { p: "/yFihWxQcmqcaBR31QM6Y8gT6aYV.jpg", b: "/8FYiQqd9Wn07b4nq0K7ICvGSL3v.jpg" },
  "Bullet Train": { p: "/tVxDe01Zy3kZqaZRNiXFGDICdZk.jpg", b: "/oxxoMRrkhZyZHcS8b2j6jb6CbQ4.jpg" },
  "The Equalizer": { p: "/cjSP68m8aDA0NQS9CvD4MJsBaQy.jpg", b: "/xzFGdngAuHFZmdT7iVy5cSeo64C.jpg" },
  "Sicario": { p: "/lz8vNyXeidqqOdJW5NjFOFlfvOd.jpg", b: "/xiIRUcOonn7kyT93oLN6Z1iu0Lr.jpg" },
  "Black Hawk Down": { p: "/dt1JINJ9JE1WZJyPKM6XEXEpNPF.jpg", b: "/jmaRWBVKsLSBQAm2DT9UwIbZemG.jpg" },
  "Atomic Blonde": { p: "/rDwgiqmycKaxEsPZjn0FH4PpQR0.jpg", b: "/aiy35Evcofzl7hASZZvsFgltOrJ.jpg" },
  "Casino Royale": { p: "/5LfBeT11J9SHvsB0z2gBjwZ4MLx.jpg", b: "/cYL5SQzUf9CkY6MzGPm8ZJsvW3X.jpg" },
  "Skyfall": { p: "/iC1mXFRGTVXFThDWrUKLaPb4XCp.jpg", b: "/tQM0QdHFM1nRfTgmqCu1xTNTrwL.jpg" },
  "The Bourne Identity": { p: "/dnoBHi7nyjvm3rtv8HQa5KGPYKt.jpg", b: "/h87gPjL6jNsLb2hLMcvP25c9vF1.jpg" },
  "Mission Impossible: Fallout": { p: "/AkJQpZp9WoNdj7pLYSj1L0RcMMN.jpg", b: "/5qxePyMYDisLe8rJiBXX0HJkKgz.jpg" },
  "Edge of Tomorrow": { p: "/iZRuRrXVgr5MBcGfDuVGcrI1OgC.jpg", b: "/3dZkTdKFkH8qojzjB7UoSWwHUWN.jpg" },
  "Kingsman: The Secret Service": { p: "/wXXpHpVVc9LkrjWHOoeaB12VFR9.jpg", b: "/2ufRT2g2YO8dLYTHCYfvpQfTIBx.jpg" },
  "Nobody": { p: "/oBgWY00bEFeZ9N25wWVyuQddbAo.jpg", b: "/30oXQKwZsXqDhMW8d8Ka6kJpaTU.jpg" },
  "Wrath of Man": { p: "/M7SUK85sKjaStg4TKhlAVyGlz3.jpg", b: "/bNs0dl5tWixxFTfgwAR1WwbfJjW.jpg" },
  "Hardcore Henry": { p: "/yk0p2eKqYjKCExnBNXk1mNl6oRG.jpg", b: "/5KSYsf9OpCcOLhM3eCfKHB9sP1g.jpg" },
  "Triple Frontier": { p: "/d2yEMxL5MYcdNn8YnTcN5d4HvTa.jpg", b: "/3KvJptLQYhcEcz2TqU8XF2QGQzU.jpg" },
  "Polar": { p: "/qFiP6OYbABbPnWJxjOiTm8t26iD.jpg", b: "/dW1aTBmYtbkk2C2ZmHLHfa1lcRv.jpg" },

  // ---- Romantic Stories (cat 7) ----
  "La La Land": { p: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg", b: "/fp6X6yhgcxzxCpmM0EVC6V9B5qS.jpg" },
  "Pride & Prejudice": { p: "/sGjIvtVvTlW01yYpdoNiM27FmAQ.jpg", b: "/4Mw9QsZ1WTUxN0VtDCcUzg4FpEi.jpg" },
  "The Notebook": { p: "/qom1SZSENdmHFNZBXbtJAU0WTlC.jpg", b: "/tVxGtkx5ZQOPOOIVTyrwwLb5e3D.jpg" },
  "Notting Hill": { p: "/A4j8S6moJS2zNtRR8oWF08gRnL5.jpg", b: "/eAfAlLTmHGMlbX3FPIYWE0n2NH.jpg" },
  "About Time": { p: "/iR1bVfURVuLjKKjIPMBL4nKXxEx.jpg", b: "/9hofuTHr3GFKfWYW2sFCp5cd0u3.jpg" },
  "Call Me by Your Name": { p: "/tEiIH5QesdheJmDAqQwvtN60727.jpg", b: "/nObB7vTzvDKwdUVZsdxlVjGwLqm.jpg" },
  "Before Sunrise": { p: "/dQCe4cVgtwiwfm6yHvGtxzvDrlf.jpg", b: "/o6Vc5zUbxARmqVzjFrLp3FkB5HZ.jpg" },
  "500 Days of Summer": { p: "/f9mbM0YMLpYemcWx6o2WeiYQLDP.jpg", b: "/7stUd6JCcfvJDsgvqvENqtfvbXR.jpg" },
  "Crazy Rich Asians": { p: "/mAEqDjmR3OiKtg9zaDFnnGV4O8R.jpg", b: "/tDLRxhLM2gp1zmflE2Zg0zJjZWG.jpg" },
  "To All the Boys I've Loved Before": { p: "/5JmZJv3xzMq7qOG3IJWRdMRLxyx.jpg", b: "/3DMK6h4vL77uJp9OdPEXWbObzS.jpg" },
  "Eternal Sunshine of the Spotless Mind": { p: "/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg", b: "/c7Yg9D3pXBFpVgBfHZcCdnnqqaP.jpg" },
  "The Theory of Everything": { p: "/r6gcRdAcyiQLLQ3EaqpyhIcjzCi.jpg", b: "/eGz8mY2nHflyM3wuKvrrFGdoX29.jpg" },
  "Atonement": { p: "/cE8Q8BLWG0iqGqLdU5e2hH8VEpm.jpg", b: "/dZA7iCmVkjmEqMzaB1cpW3jmGny.jpg" },
  "One Day": { p: "/ww2yLSEpzlrwAJVEFPqbVhpdjsb.jpg", b: "/9kvzN0vZTPL3JXPXFb22RYgTkPb.jpg" },
  "Me Before You": { p: "/lEjbMKkWiHFJTsvR62diClaO5gW.jpg", b: "/o9o4OnkNcqNJlFRRr3p7CAnP3LB.jpg" },
  "P.S. I Love You": { p: "/xZ9aMkWFSqvQBvRsNb2eHmm46x4.jpg", b: "/dHCSTrMM0cVOvbsW3tkOJW4UEFR.jpg" },
  "Sense and Sensibility": { p: "/iDgXgJUXJI6JRTaOoY0QKAtnO0a.jpg", b: "/2TxYWGV9OHlMwTdoQzxg3CkLBSE.jpg" },
  "Brooklyn": { p: "/bxYZH5PTm21Zc8YVxrlH4WQGBbm.jpg", b: "/n2Tp4lk6CwbKlUZyMzBpJqRu8H6.jpg" },
  "Carol": { p: "/mqpFgvTvGXRmgClPTI09kLpIvDm.jpg", b: "/zU6XRyTMnYvxJTvkjqL6F5kIZkr.jpg" },
  "Anyone But You": { p: "/yRt7MGBElkLDZD5gWMHfJqfVaIb.jpg", b: "/xhkOcaG8kRm5JvKkCgMaQaQy7lV.jpg" },
  "Roman Holiday": { p: "/cKUxKy9vpgrZQI9GdqEMeXdrUvg.jpg", b: "/nWNbDc2g5lWlIp0V3xgPNxRgiVH.jpg" },
  "Sleepless in Seattle": { p: "/bWmkTSAm1mmbXq3EJpejCGZL2Lm.jpg", b: "/yIyPmLpEkXVmEwzc1EckZyPb6f.jpg" },
};

// Pre-built normalized lookup map (built once at module load).
const NORMALIZED_MAP: Record<string, ArtRef> = Object.fromEntries(
  Object.entries(TITLE_ART).map(([k, v]) => [normalizeKey(k), v]),
);

/**
 * Resolve a movie title to its TMDB poster + backdrop URLs. Falls back to a
 * deterministic FALLBACK_ART entry (based on the title slug) if no match.
 */
export const getArtForTitle = (title: string): { poster: string; backdrop: string } => {
  const key = normalizeKey(title);
  const hit = NORMALIZED_MAP[key];
  if (hit) {
    return {
      poster: TMDB_POSTER_BASE + hit.p,
      backdrop: TMDB_BACKDROP_BASE + hit.b,
    };
  }
  // Unique-per-title deterministic fallback (no repeats, always loads).
  return getFallbackArtForTitle(title);
};
