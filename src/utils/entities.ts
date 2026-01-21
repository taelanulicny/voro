/**
 * Centralized Entity Data
 * This ensures consistent entity information across all screens
 */

export interface EntityData {
  id: number;
  name: string;
  category: string;
  basePrice: number;
  description: string;
}

// Single source of truth for all entities
export const ENTITIES: EntityData[] = [
  {
    id: 10,

    name: 'Donald Trump',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Former president and political figure. Trade confidence in political influence and electoral prospects.',
  },
  // Influencers
  {
    id: 11,

    name: 'Alix Earle',
    category: 'Influencers',
    basePrice: 100,
    description: 'TikTok influencer and content creator. Track confidence in Alix Earle\'s influence, brand partnerships, and audience growth.',
  },
  {
    id: 12,

    name: 'MrBeast',
    category: 'Influencers',
    basePrice: 100,
    description: 'YouTube creator and philanthropist. Trade confidence in MrBeast\'s channel growth, business ventures, and social impact initiatives.',
  },
  {
    id: 14,

    name: 'Kai Cenat',
    category: 'Influencers',
    basePrice: 100,
    description: 'Twitch streamer and content creator. Trade confidence in Kai Cenat\'s streaming success, audience engagement, and career trajectory.',
  },
  {
    id: 20,

    name: 'Charli D\'Amelio',
    category: 'Influencers',
    basePrice: 100,
    description: 'TikTok star and social media influencer. Trade confidence in Charli D\'Amelio\'s influence, brand deals, and career growth.',
  },
  {
    id: 15,

    name: 'Logan Paul',
    category: 'Influencers',
    basePrice: 100,
    description: 'YouTube creator, boxer, and entrepreneur. Track confidence in Logan Paul\'s ventures, fight career, and business success.',
  },
  {
    id: 19,

    name: 'Jake Paul',
    category: 'Influencers',
    basePrice: 100,
    description: 'YouTube creator, boxer, and entrepreneur. Track confidence in Jake Paul\'s boxing career, business ventures, and public profile.',
  },
  {
    id: 18,

    name: 'Alex Cooper',
    category: 'Influencers',
    basePrice: 100,
    description: 'Podcast host and media personality. Trade confidence in Alex Cooper\'s podcast success, brand expansion, and media influence.',
  },
  {
    id: 16,

    name: 'Emma Chamberlain',
    category: 'Influencers',
    basePrice: 100,
    description: 'YouTube creator and fashion influencer. Trade confidence in Emma Chamberlain\'s brand partnerships, content creation, and influence.',
  },
  {
    id: 17,

    name: 'Adin Ross',
    category: 'Influencers',
    basePrice: 100,
    description: 'Twitch streamer and content creator. Track confidence in Adin Ross\'s streaming career, collaborations, and audience growth.',
  },
  {
    id: 13,

    name: 'Andrew Tate',
    category: 'Influencers',
    basePrice: 100,
    description: 'Controversial internet personality and former kickboxer. Track confidence in Andrew Tate\'s influence and media presence.',
  },
  {
    id: 268,
    name: 'Joe Rogan',
    category: 'Influencers',
    basePrice: 100,
    description: 'Podcast host, comedian, and UFC commentator. Trade confidence in Joe Rogan\'s podcast success, audience reach, and media influence.',
  },
  {
    id: 269,
    name: 'iShowSpeed',
    category: 'Influencers',
    basePrice: 100,
    description: 'YouTube streamer and content creator. Track confidence in iShowSpeed\'s streaming success, viral content, and audience growth.',
  },
  {
    id: 270,
    name: 'David Dobrik',
    category: 'Influencers',
    basePrice: 100,
    description: 'YouTube creator and vlogger. Trade confidence in David Dobrik\'s content creation, brand partnerships, and audience engagement.',
  },
  {
    id: 271,
    name: 'KSI',
    category: 'Influencers',
    basePrice: 100,
    description: 'YouTube creator, rapper, and boxer. Track confidence in KSI\'s content success, boxing career, and business ventures.',
  },
  {
    id: 272,
    name: 'Theo Von',
    category: 'Influencers',
    basePrice: 100,
    description: 'Comedian and podcast host. Trade confidence in Theo Von\'s podcast success, comedy career, and audience growth.',
  },
  {
    id: 273,
    name: 'Livvy Dunne',
    category: 'Influencers',
    basePrice: 100,
    description: 'Gymnast and social media influencer. Track confidence in Livvy Dunne\'s athletic career, brand partnerships, and social media influence.',
  },
  // Music Artists
  {
    id: 21,

    name: 'Taylor Swift',
    category: 'Music Artists',
    basePrice: 100,
    description: 'Award-winning singer-songwriter and global pop icon. Track confidence in Taylor Swift\'s album releases, tours, and cultural influence.',
  },
  {
    id: 22,

    name: 'Drake',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Grammy-winning rapper and record producer. Trade confidence in Drake\'s chart dominance, album releases, and business ventures.',
  },
  {
    id: 23,

    name: 'Kanye West',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Influential rapper, producer, and fashion designer. Track confidence in Kanye West\'s music releases and brand partnerships.',
  },
  {
    id: 24,

    name: 'Bad Bunny',
    category: 'Music Artists',
    basePrice: 100,
    description: 'Global reggaeton and Latin trap artist. Trade confidence in Bad Bunny\'s chart success, tours, and cultural impact.',
  },
  {
    id: 25,

    name: 'Travis Scott',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Hip-hop artist and record producer. Track confidence in Travis Scott\'s album releases, collaborations, and live performances.',
  },
  {
    id: 26,

    name: 'Olivia Rodrigo',
    category: 'Music Artists',
    basePrice: 100,
    description: 'Rising pop star and songwriter. Trade confidence in Olivia Rodrigo\'s album success, chart performance, and growing fanbase.',
  },
  {
    id: 27,

    name: 'Playboi Carti',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper and songwriter known for experimental sound. Track confidence in Playboi Carti\'s releases and influence on hip-hop culture.',
  },
  {
    id: 28,

    name: 'Ice Spice',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rising rapper and viral sensation. Trade confidence in Ice Spice\'s chart success, collaborations, and career growth.',
  },
  {
    id: 29,

    name: 'The Weeknd',
    category: 'Music Artists',
    basePrice: 100,
    description: 'Grammy-winning singer, songwriter, and producer. Track confidence in The Weeknd\'s album releases, tours, and artistic evolution.',
  },
  {
    id: 30,

    name: 'Doja Cat',
    category: 'Music Artists',
    basePrice: 100,
    description: 'Singer, rapper, and songwriter. Trade confidence in Doja Cat\'s chart-topping hits, album releases, and social media presence.',
  },
  // Political Figures
  {
    id: 31,

    name: 'Joe Biden',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Current president of the United States. Track confidence in Joe Biden\'s policy decisions, approval ratings, and political influence.',
  },
  {
    id: 32,

    name: 'Kamala Harris',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Vice President of the United States. Trade confidence in Kamala Harris\'s political standing, policy impact, and future prospects.',
  },
  {
    id: 33,

    name: 'Ron DeSantis',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Governor of Florida and political figure. Track confidence in Ron DeSantis\'s political influence, policy decisions, and electoral prospects.',
  },
  {
    id: 34,

    name: 'Alexandria Ocasio-Cortez',
    category: 'Political Figures',
    basePrice: 100,
    description: 'U.S. Representative and progressive political figure. Trade confidence in Alexandria Ocasio-Cortez\'s policy advocacy and political influence.',
  },
  {
    id: 35,

    name: 'Vivek Ramaswamy',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Entrepreneur and political figure. Track confidence in Vivek Ramaswamy\'s political influence, policy positions, and public profile.',
  },
  {
    id: 36,

    name: 'Nikki Haley',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Former U.N. Ambassador and political figure. Trade confidence in Nikki Haley\'s political standing, policy influence, and electoral prospects.',
  },
  {
    id: 37,

    name: 'Gavin Newsom',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Governor of California and political figure. Track confidence in Gavin Newsom\'s policy decisions, political influence, and future prospects.',
  },
  {
    id: 38,

    name: 'Tucker Carlson',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Media personality and political commentator. Trade confidence in Tucker Carlson\'s influence, media presence, and political impact.',
  },
  {
    id: 39,

    name: 'Bernie Sanders',
    category: 'Political Figures',
    basePrice: 100,
    description: 'U.S. Senator and progressive political figure. Track confidence in Bernie Sanders\'s policy advocacy, political influence, and public support.',
  },
  {
    id: 258,
    name: 'Barack Obama',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Former president of the United States. Trade confidence in Barack Obama\'s political influence, policy legacy, and public standing.',
  },
  {
    id: 259,
    name: 'Zohran Mamdani',
    category: 'Political Figures',
    basePrice: 100,
    description: 'New York State Assembly member and progressive political figure. Track confidence in Zohran Mamdani\'s policy advocacy and political influence.',
  },
  {
    id: 260,
    name: 'J.D. Vance',
    category: 'Political Figures',
    basePrice: 100,
    description: 'U.S. Senator and political figure. Trade confidence in J.D. Vance\'s policy positions, political influence, and electoral prospects.',
  },
  {
    id: 261,
    name: 'Marco Rubio',
    category: 'Political Figures',
    basePrice: 100,
    description: 'U.S. Senator and political figure. Track confidence in Marco Rubio\'s policy decisions, political influence, and future prospects.',
  },
  {
    id: 262,
    name: 'RFK Jr.',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Political figure and environmental activist. Trade confidence in RFK Jr.\'s political influence, policy positions, and public profile.',
  },
  {
    id: 263,
    name: 'Mike Johnson',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Speaker of the House and U.S. Representative. Track confidence in Mike Johnson\'s political influence, policy decisions, and leadership.',
  },
  {
    id: 264,
    name: 'Hakeem Jeffries',
    category: 'Political Figures',
    basePrice: 100,
    description: 'House Minority Leader and U.S. Representative. Trade confidence in Hakeem Jeffries\'s political influence, policy positions, and leadership.',
  },
  {
    id: 265,
    name: 'Benjamin Netanyahu',
    category: 'Political Figures',
    basePrice: 100,
    description: 'Prime Minister of Israel and political figure. Track confidence in Benjamin Netanyahu\'s political influence, policy decisions, and leadership.',
  },
  {
    id: 266,
    name: 'Vladimir Putin',
    category: 'Political Figures',
    basePrice: 100,
    description: 'President of Russia and political figure. Trade confidence in Vladimir Putin\'s political influence, policy decisions, and international standing.',
  },
  {
    id: 267,
    name: 'Volodymyr Zelensky',
    category: 'Political Figures',
    basePrice: 100,
    description: 'President of Ukraine and political figure. Track confidence in Volodymyr Zelensky\'s leadership, policy decisions, and international support.',
  },
  // Actors
  {
    id: 50,

    name: 'Zendaya',
    category: 'Actors',
    basePrice: 100,
    description: 'Award-winning actress and singer. Trade confidence in Zendaya\'s acting career, box office success, and industry influence.',
  },
  {
    id: 51,

    name: 'Timothée Chalamet',
    category: 'Actors',
    basePrice: 100,
    description: 'Acclaimed actor known for dramatic roles. Track confidence in Timothée Chalamet\'s film projects, awards recognition, and career trajectory.',
  },
  {
    id: 52,

    name: 'Sydney Sweeney',
    category: 'Actors',
    basePrice: 100,
    description: 'Rising actress and producer. Trade confidence in Sydney Sweeney\'s acting roles, production ventures, and industry presence.',
  },
  {
    id: 53,

    name: 'Tom Holland',
    category: 'Actors',
    basePrice: 100,
    description: 'Actor best known for Spider-Man franchise. Track confidence in Tom Holland\'s film projects, box office performance, and career growth.',
  },
  {
    id: 54,

    name: 'Pedro Pascal',
    category: 'Actors',
    basePrice: 100,
    description: 'Versatile actor in film and television. Trade confidence in Pedro Pascal\'s roles, show success, and entertainment industry impact.',
  },
  // NBA Players
  {
    id: 55,

    name: 'LeBron James',
    category: 'NBA Players',
    basePrice: 100,
    description: 'NBA superstar and all-time great. Trade confidence in LeBron James\'s performance, team success, and legacy in basketball.',
  },
  {
    id: 56,

    name: 'Stephen Curry',
    category: 'NBA Players',
    basePrice: 100,
    description: 'Three-point shooting legend and Warriors icon. Track confidence in Stephen Curry\'s shooting, team performance, and career milestones.',
  },
  {
    id: 57,

    name: 'Victor Wembanyama',
    category: 'NBA Players',
    basePrice: 100,
    description: 'Rising star and generational talent. Trade confidence in Victor Wembanyama\'s development, rookie performance, and future potential.',
  },
  {
    id: 58,

    name: 'Nikola Jokic',
    category: 'NBA Players',
    basePrice: 100,
    description: 'Reigning MVP and elite center. Track confidence in Nikola Jokic\'s playmaking, team success, and championship aspirations.',
  },
  {
    id: 59,

    name: 'Luka Dončić',
    category: 'NBA Players',
    basePrice: 100,
    description: 'Dynamic guard and triple-double machine. Trade confidence in Luka Dončić\'s scoring, assists, and Mavericks success.',
  },
  {
    id: 60,

    name: 'Anthony Edwards',
    category: 'NBA Players',
    basePrice: 100,
    description: 'Explosive guard and rising star. Track confidence in Anthony Edwards\'s scoring ability, team leadership, and playoff performance.',
  },
  {
    id: 61,

    name: 'Shai Gilgeous-Alexander',
    category: 'NBA Players',
    basePrice: 100,
    description: 'Elite guard and Thunder leader. Trade confidence in Shai Gilgeous-Alexander\'s scoring, team building, and All-Star status.',
  },
  // NFL Players
  {
    id: 62,

    name: 'Patrick Mahomes',
    category: 'NFL Players',
    basePrice: 100,
    description: 'Super Bowl champion quarterback and Chiefs leader. Trade confidence in Patrick Mahomes\'s performance, team success, and MVP potential.',
  },
  {
    id: 63,

    name: 'Drake Maye',
    category: 'NFL Players',
    basePrice: 100,
    description: 'Rising quarterback prospect. Track confidence in Drake Maye\'s development, draft position, and NFL career trajectory.',
  },
  {
    id: 64,

    name: 'Joe Burrow',
    category: 'NFL Players',
    basePrice: 100,
    description: 'Elite quarterback and Bengals leader. Trade confidence in Joe Burrow\'s passing, playoff performance, and championship aspirations.',
  },
  {
    id: 65,

    name: 'Travis Kelce',
    category: 'NFL Players',
    basePrice: 100,
    description: 'All-Pro tight end and Chiefs star. Track confidence in Travis Kelce\'s receiving, team chemistry, and Super Bowl success.',
  },
  {
    id: 66,

    name: 'Caleb Williams',
    category: 'NFL Players',
    basePrice: 100,
    description: 'Top quarterback prospect and Heisman winner. Trade confidence in Caleb Williams\'s draft stock, NFL readiness, and future potential.',
  },
  {
    id: 69,

    name: 'Tom Brady',
    category: 'NFL Players',
    basePrice: 100,
    description: 'Seven-time Super Bowl champion and greatest quarterback of all time. Trade confidence in Tom Brady\'s legacy, retirement impact, and post-career ventures.',
  },
  // Soccer Players
  {
    id: 67,

    name: 'Lionel Messi',
    category: 'Soccer Players',
    basePrice: 100,
    description: 'World Cup champion and football legend. Trade confidence in Lionel Messi\'s performance, team success, and legacy in soccer.',
  },
  {
    id: 68,

    name: 'Cristiano Ronaldo',
    category: 'Soccer Players',
    basePrice: 100,
    description: 'Global football icon and goal-scoring machine. Track confidence in Cristiano Ronaldo\'s goals, team impact, and career milestones.',
  },
  // NFL Teams
  {
    id: 100,

    name: 'Kansas City Chiefs',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Kansas City. Track confidence in the Chiefs\' performance, playoff prospects, and fan engagement.',
  },
  {
    id: 101,

    name: 'Buffalo Bills',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Buffalo. Trade confidence in the Bills\' season performance, playoff chances, and team success.',
  },
  {
    id: 102,

    name: 'Baltimore Ravens',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Baltimore. Track confidence in the Ravens\' performance, roster strength, and championship potential.',
  },
  {
    id: 103,

    name: 'Cincinnati Bengals',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Cincinnati. Trade confidence in the Bengals\' season outlook, player performance, and playoff aspirations.',
  },
  {
    id: 104,

    name: 'Cleveland Browns',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Cleveland. Track confidence in the Browns\' performance, roster decisions, and season success.',
  },
  {
    id: 105,

    name: 'Pittsburgh Steelers',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Pittsburgh. Trade confidence in the Steelers\' tradition, team performance, and playoff chances.',
  },
  {
    id: 106,

    name: 'Houston Texans',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Houston. Track confidence in the Texans\' rebuilding process, draft picks, and future success.',
  },
  {
    id: 107,

    name: 'Indianapolis Colts',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Indianapolis. Trade confidence in the Colts\' performance, quarterback situation, and season outlook.',
  },
  {
    id: 108,

    name: 'Jacksonville Jaguars',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Jacksonville. Track confidence in the Jaguars\' development, young talent, and competitive progress.',
  },
  {
    id: 109,

    name: 'Tennessee Titans',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Tennessee. Trade confidence in the Titans\' performance, coaching decisions, and playoff potential.',
  },
  {
    id: 110,

    name: 'Denver Broncos',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Denver. Track confidence in the Broncos\' roster moves, quarterback play, and season performance.',
  },
  {
    id: 111,

    name: 'Los Angeles Chargers',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Los Angeles. Trade confidence in the Chargers\' talent, playoff chances, and championship aspirations.',
  },
  {
    id: 112,

    name: 'Los Angeles Rams',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Los Angeles. Track confidence in the Rams\' roster construction, coaching, and competitive success.',
  },
  {
    id: 113,

    name: 'Las Vegas Raiders',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Las Vegas. Trade confidence in the Raiders\' performance, team culture, and playoff prospects.',
  },
  {
    id: 114,

    name: 'Dallas Cowboys',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Dallas. Track confidence in the Cowboys\' performance, playoff success, and championship potential.',
  },
  {
    id: 115,

    name: 'New York Giants',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in New York. Trade confidence in the Giants\' rebuilding efforts, draft strategy, and future success.',
  },
  {
    id: 116,

    name: 'Philadelphia Eagles',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Philadelphia. Track confidence in the Eagles\' performance, roster depth, and Super Bowl chances.',
  },
  {
    id: 117,

    name: 'Washington Commanders',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Washington. Trade confidence in the Commanders\' rebuild, new ownership, and team development.',
  },
  {
    id: 118,

    name: 'Chicago Bears',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Chicago. Track confidence in the Bears\' quarterback development, roster building, and competitive progress.',
  },
  {
    id: 119,

    name: 'Detroit Lions',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Detroit. Trade confidence in the Lions\' resurgence, coaching success, and playoff performance.',
  },
  {
    id: 120,

    name: 'Green Bay Packers',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Green Bay. Track confidence in the Packers\' quarterback transition, team performance, and playoff chances.',
  },
  {
    id: 121,

    name: 'Minnesota Vikings',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Minnesota. Trade confidence in the Vikings\' performance, roster decisions, and competitive success.',
  },
  {
    id: 122,

    name: 'Atlanta Falcons',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Atlanta. Track confidence in the Falcons\' rebuild, quarterback situation, and future prospects.',
  },
  {
    id: 123,

    name: 'Carolina Panthers',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Carolina. Trade confidence in the Panthers\' rebuilding process, draft picks, and team development.',
  },
  {
    id: 124,

    name: 'New Orleans Saints',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in New Orleans. Track confidence in the Saints\' performance, roster management, and playoff aspirations.',
  },
  {
    id: 125,

    name: 'Tampa Bay Buccaneers',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Tampa Bay. Trade confidence in the Buccaneers\' performance, quarterback situation, and competitive success.',
  },
  {
    id: 126,

    name: 'Arizona Cardinals',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Arizona. Track confidence in the Cardinals\' rebuild, draft strategy, and future development.',
  },
  {
    id: 127,

    name: 'San Francisco 49ers',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in San Francisco. Trade confidence in the 49ers\' roster talent, coaching, and Super Bowl potential.',
  },
  {
    id: 128,

    name: 'Seattle Seahawks',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Seattle. Track confidence in the Seahawks\' performance, quarterback play, and playoff chances.',
  },
  {
    id: 129,

    name: 'New England Patriots',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in New England. Trade confidence in the Patriots\' rebuild, coaching decisions, and future success.',
  },
  {
    id: 130,

    name: 'New York Jets',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in New York. Track confidence in the Jets\' quarterback situation, roster talent, and competitive progress.',
  },
  {
    id: 131,

    name: 'Miami Dolphins',
    category: 'NFL Teams',
    basePrice: 100,
    description: 'NFL team based in Miami. Trade confidence in the Dolphins\' offensive performance, playoff chances, and team success.',
  },
  // NBA Teams
  {
    id: 200,

    name: 'Boston Celtics',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Boston. Track confidence in the Celtics\' performance, playoff prospects, and championship potential.',
  },
  {
    id: 201,

    name: 'Milwaukee Bucks',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Milwaukee. Trade confidence in the Bucks\' roster talent, star players, and title chances.',
  },
  {
    id: 202,

    name: 'Denver Nuggets',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Denver. Track confidence in the Nuggets\' championship core, coaching, and competitive success.',
  },
  {
    id: 203,

    name: 'Phoenix Suns',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Phoenix. Trade confidence in the Suns\' star power, roster depth, and playoff performance.',
  },
  {
    id: 204,

    name: 'Los Angeles Lakers',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Los Angeles. Track confidence in the Lakers\' legacy, star players, and championship aspirations.',
  },
  {
    id: 205,

    name: 'Golden State Warriors',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in San Francisco. Trade confidence in the Warriors\' dynasty, shooting, and title contention.',
  },
  {
    id: 206,

    name: 'Philadelphia 76ers',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Philadelphia. Track confidence in the 76ers\' star talent, team chemistry, and playoff success.',
  },
  {
    id: 207,

    name: 'Miami Heat',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Miami. Trade confidence in the Heat\'s culture, coaching, and playoff resilience.',
  },
  {
    id: 208,

    name: 'Dallas Mavericks',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Dallas. Track confidence in the Mavericks\' star duo, offensive firepower, and playoff potential.',
  },
  {
    id: 209,

    name: 'Cleveland Cavaliers',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Cleveland. Trade confidence in the Cavaliers\' young core, development, and competitive progress.',
  },
  {
    id: 210,

    name: 'New York Knicks',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in New York. Track confidence in the Knicks\' rebuild, roster moves, and playoff chances.',
  },
  {
    id: 211,

    name: 'Los Angeles Clippers',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Los Angeles. Trade confidence in the Clippers\' star talent, depth, and championship window.',
  },
  {
    id: 212,

    name: 'Oklahoma City Thunder',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Oklahoma City. Track confidence in the Thunder\'s young stars, rebuild, and future potential.',
  },
  {
    id: 213,

    name: 'Minnesota Timberwolves',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Minnesota. Trade confidence in the Timberwolves\' roster construction and playoff performance.',
  },
  {
    id: 214,

    name: 'Sacramento Kings',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Sacramento. Track confidence in the Kings\' offensive system, young talent, and competitive growth.',
  },
  {
    id: 215,

    name: 'New Orleans Pelicans',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in New Orleans. Trade confidence in the Pelicans\' young stars, depth, and playoff aspirations.',
  },
  {
    id: 216,

    name: 'Atlanta Hawks',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Atlanta. Track confidence in the Hawks\' backcourt, roster moves, and playoff contention.',
  },
  {
    id: 217,

    name: 'Chicago Bulls',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Chicago. Trade confidence in the Bulls\' roster, coaching, and competitive direction.',
  },
  {
    id: 218,

    name: 'Toronto Raptors',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Toronto. Track confidence in the Raptors\' rebuild, young talent, and future development.',
  },
  {
    id: 219,

    name: 'Indiana Pacers',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Indiana. Trade confidence in the Pacers\' fast-paced offense, young core, and growth.',
  },
  {
    id: 220,

    name: 'Orlando Magic',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Orlando. Track confidence in the Magic\'s young talent, defensive identity, and rebuild progress.',
  },
  {
    id: 221,

    name: 'Washington Wizards',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Washington. Trade confidence in the Wizards\' rebuild, draft strategy, and future direction.',
  },
  {
    id: 222,

    name: 'Charlotte Hornets',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Charlotte. Track confidence in the Hornets\' young stars, development, and competitive progress.',
  },
  {
    id: 223,

    name: 'Detroit Pistons',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Detroit. Trade confidence in the Pistons\' rebuild, young core, and future potential.',
  },
  {
    id: 224,

    name: 'Brooklyn Nets',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Brooklyn. Track confidence in the Nets\' rebuild, roster moves, and competitive direction.',
  },
  {
    id: 225,

    name: 'Utah Jazz',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Utah. Trade confidence in the Jazz\'s rebuild, young talent, and development strategy.',
  },
  {
    id: 226,

    name: 'Portland Trail Blazers',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Portland. Track confidence in the Trail Blazers\' rebuild, draft picks, and future direction.',
  },
  {
    id: 227,

    name: 'Houston Rockets',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Houston. Trade confidence in the Rockets\' young core, development, and rebuild progress.',
  },
  {
    id: 228,

    name: 'Memphis Grizzlies',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in Memphis. Track confidence in the Grizzlies\' young stars, culture, and competitive potential.',
  },
  {
    id: 229,

    name: 'San Antonio Spurs',
    category: 'NBA Teams',
    basePrice: 100,
    description: 'NBA team based in San Antonio. Trade confidence in the Spurs\' rebuild, young talent, and future development.',
  },
  // Country Music
  {
    id: 230,
    name: 'Morgan Wallen',
    category: 'Country Music',
    basePrice: 100,
    description: 'Country music singer and songwriter. Track confidence in Morgan Wallen\'s chart success, album releases, and fanbase growth.',
  },
  {
    id: 231,
    name: 'Zach Bryan',
    category: 'Country Music',
    basePrice: 100,
    description: 'Country and Americana singer-songwriter. Trade confidence in Zach Bryan\'s authentic sound, album releases, and rising popularity.',
  },
  {
    id: 232,
    name: 'Luke Combs',
    category: 'Country Music',
    basePrice: 100,
    description: 'Country music singer and songwriter. Track confidence in Luke Combs\' hit songs, tours, and continued chart dominance.',
  },
  {
    id: 233,
    name: 'Chris Stapleton',
    category: 'Country Music',
    basePrice: 100,
    description: 'Country music singer-songwriter and guitarist. Trade confidence in Chris Stapleton\'s Grammy-winning music and live performances.',
  },
  {
    id: 234,
    name: 'Kane Brown',
    category: 'Country Music',
    basePrice: 100,
    description: 'Country music singer and songwriter. Track confidence in Kane Brown\'s crossover success, collaborations, and fan engagement.',
  },
  {
    id: 235,
    name: 'Lainey Wilson',
    category: 'Country Music',
    basePrice: 100,
    description: 'Country music singer and songwriter. Trade confidence in Lainey Wilson\'s rising career, award recognition, and hit singles.',
  },
  {
    id: 236,
    name: 'Tyler Childers',
    category: 'Country Music',
    basePrice: 100,
    description: 'Country and Americana singer-songwriter. Track confidence in Tyler Childers\' authentic storytelling, album releases, and dedicated fanbase.',
  },
  {
    id: 237,
    name: 'Noah Kahan',
    category: 'Country Music',
    basePrice: 100,
    description: 'Singer-songwriter blending folk and country. Trade confidence in Noah Kahan\'s viral success, album releases, and growing popularity.',
  },
  {
    id: 238,
    name: 'Luke Bryan',
    category: 'Country Music',
    basePrice: 100,
    description: 'Country music singer and songwriter. Track confidence in Luke Bryan\'s hit songs, tours, and continued presence in country music.',
  },
  {
    id: 239,
    name: 'Thomas Rhett',
    category: 'Country Music',
    basePrice: 100,
    description: 'Country music singer and songwriter. Trade confidence in Thomas Rhett\'s chart-topping hits, album releases, and fanbase loyalty.',
  },
  // Rap Music
  {
    id: 240,
    name: 'Lil Uzi Vert',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper and songwriter known for melodic trap. Track confidence in Lil Uzi Vert\'s album releases, collaborations, and fanbase engagement.',
  },
  {
    id: 241,
    name: 'Future',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper, singer, and record producer. Trade confidence in Future\'s chart dominance, album releases, and influence on trap music.',
  },
  {
    id: 242,
    name: 'Young Thug',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper, singer, and record executive. Track confidence in Young Thug\'s unique style, album releases, and label success.',
  },
  {
    id: 243,
    name: '21 Savage',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper and songwriter. Trade confidence in 21 Savage\'s chart success, album releases, and collaborations.',
  },
  {
    id: 244,
    name: 'Lil Baby',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper and songwriter. Track confidence in Lil Baby\'s album releases, chart performance, and rising popularity.',
  },
  {
    id: 245,
    name: 'Gunna',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper and songwriter known for melodic trap. Trade confidence in Gunna\'s album releases, collaborations, and fanbase growth.',
  },
  {
    id: 246,
    name: 'Don Toliver',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper, singer, and songwriter. Track confidence in Don Toliver\'s melodic rap, album releases, and rising career.',
  },
  {
    id: 247,
    name: 'A$AP Rocky',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper, songwriter, and fashion icon. Trade confidence in A$AP Rocky\'s album releases, fashion ventures, and artistic evolution.',
  },
  {
    id: 248,
    name: 'Metro Boomin',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Record producer and rapper. Track confidence in Metro Boomin\'s production credits, album releases, and influence in hip-hop.',
  },
  {
    id: 249,
    name: 'Tyler, The Creator',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper, singer, producer, and fashion designer. Trade confidence in Tyler, The Creator\'s Grammy-winning music, albums, and creative ventures.',
  },
  {
    id: 250,
    name: 'Yeat',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper and songwriter known for experimental sound. Track confidence in Yeat\'s viral success, album releases, and growing fanbase.',
  },
  {
    id: 251,
    name: 'Destroy Lonely',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper and songwriter. Trade confidence in Destroy Lonely\'s unique style, album releases, and rising popularity.',
  },
  {
    id: 252,
    name: 'Ken Carson',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper and songwriter. Track confidence in Ken Carson\'s album releases, collaborations, and fanbase growth.',
  },
  {
    id: 253,
    name: 'J. Cole',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper, singer, and record producer. Trade confidence in J. Cole\'s critically acclaimed albums, storytelling, and label success.',
  },
  {
    id: 254,
    name: 'Kendrick Lamar',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper, songwriter, and record producer. Track confidence in Kendrick Lamar\'s Pulitzer Prize-winning music, albums, and artistic impact.',
  },
  {
    id: 255,
    name: 'Rod Wave',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper and singer known for melodic rap. Trade confidence in Rod Wave\'s chart success, album releases, and emotional storytelling.',
  },
  {
    id: 256,
    name: 'NLE Choppa',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper and songwriter. Track confidence in NLE Choppa\'s viral hits, album releases, and growing popularity.',
  },
  {
    id: 257,
    name: 'Baby Keem',
    category: 'Rap Music',
    basePrice: 100,
    description: 'Rapper, singer, and producer. Trade confidence in Baby Keem\'s Grammy-winning music, album releases, and collaborations with Kendrick Lamar.',
  },
  // Pop Music
  {
    id: 258,
    name: 'Taylor Swift',
    category: 'Pop Music',
    basePrice: 100,
    description: 'Award-winning singer-songwriter and global pop icon. Track confidence in Taylor Swift\'s album releases, tours, and cultural influence.',
  },
  {
    id: 259,
    name: 'Ariana Grande',
    category: 'Pop Music',
    basePrice: 100,
    description: 'Grammy-winning pop superstar. Trade confidence in Ariana Grande\'s chart-topping hits, album releases, and massive global fanbase.',
  },
  {
    id: 260,
    name: 'Harry Styles',
    category: 'Pop Music',
    basePrice: 100,
    description: 'Singer-songwriter and former One Direction member. Track confidence in Harry Styles\' solo career, album releases, and cultural impact.',
  },
  {
    id: 261,
    name: 'Billie Eilish',
    category: 'Pop Music',
    basePrice: 100,
    description: 'Grammy-winning alternative pop artist. Trade confidence in Billie Eilish\'s chart dominance, album releases, and influence on Gen Z culture.',
  },
  {
    id: 262,
    name: 'Dua Lipa',
    category: 'Pop Music',
    basePrice: 100,
    description: 'International pop sensation. Track confidence in Dua Lipa\'s global hits, album releases, and growing influence in the pop music scene.',
  },
  {
    id: 263,
    name: 'Olivia Rodrigo',
    category: 'Pop Music',
    basePrice: 100,
    description: 'Rising pop star and songwriter. Trade confidence in Olivia Rodrigo\'s album success, chart performance, and growing fanbase.',
  },
  {
    id: 264,
    name: 'The Weeknd',
    category: 'Pop Music',
    basePrice: 100,
    description: 'Grammy-winning pop and R&B artist. Track confidence in The Weeknd\'s chart-topping albums, tours, and cultural influence.',
  },
  {
    id: 265,
    name: 'Doja Cat',
    category: 'Pop Music',
    basePrice: 100,
    description: 'Pop and rap crossover artist. Trade confidence in Doja Cat\'s viral hits, album releases, and growing mainstream success.',
  },
  {
    id: 266,
    name: 'Ed Sheeran',
    category: 'Pop Music',
    basePrice: 100,
    description: 'Singer-songwriter and global pop star. Track confidence in Ed Sheeran\'s chart-topping albums, world tours, and consistent hit-making.',
  },
  {
    id: 267,
    name: 'Bruno Mars',
    category: 'Pop Music',
    basePrice: 100,
    description: 'Grammy-winning pop and R&B artist. Trade confidence in Bruno Mars\' hit singles, album releases, and live performance excellence.',
  },
];

/**
 * Get entity by ID
 */
export const getEntityById = (id: number): EntityData | undefined => {
  return ENTITIES.find(entity => entity.id === id);
};

/**
 * Get all entities
 */
export const getAllEntities = (): EntityData[] => {
  return ENTITIES;
};

/**
 * Get entities by category
 */
export const getEntitiesByCategory = (category: string): EntityData[] => {
  // People category aggregates entities from multiple subcategories
  if (category === 'People') {
    const peopleSubcategories = [
      'Actors',
      'NBA Players',
      'NFL Players',
      'Soccer Players',
      'Influencers',
      'Political Figures',
      'Rap Music',
      'Country Music',
      'Pop Music',
    ];
    return ENTITIES.filter(entity => peopleSubcategories.includes(entity.category));
  }
  // Teams category aggregates entities from team subcategories
  if (category === 'Teams') {
    const teamsSubcategories = [
      'NFL Teams',
      'NBA Teams',
      'College Basketball Teams',
    ];
    return ENTITIES.filter(entity => teamsSubcategories.includes(entity.category));
  }
  return ENTITIES.filter(entity => entity.category === category);
};

/**
 * Get entity by name (case-insensitive)
 */
export const getEntityByName = (name: string): EntityData | undefined => {
  return ENTITIES.find(entity => 
    entity.name.toLowerCase() === name.toLowerCase()
  );
};

/**
 * Convert entity name to mention format (remove spaces)
 */
export const entityNameToMention = (name: string): string => {
  return name.replace(/\s+/g, '');
};

/**
 * Clean mention name (remove trailing apostrophes, 's', etc.)
 */
export const cleanMentionName = (mentionName: string): string => {
  return mentionName.replace(/['"]+s?$/i, '').trim();
};

/**
 * Find entity by mention format (handles both mention format and full name)
 */
export const getEntityByMention = (mentionName: string): EntityData | undefined => {
  const cleanedName = cleanMentionName(mentionName);
  
  // First try exact match with cleaned name
  let entity = getEntityByName(cleanedName);
  if (entity) return entity;
  
  // Try all entities to find one whose mention format matches
  return ENTITIES.find((e) => {
    const entityMentionName = entityNameToMention(e.name);
    return entityMentionName.toLowerCase() === cleanedName.toLowerCase();
  });
};

/**
 * Extract all entity mentions from text
 * Returns array of EntityData objects that are mentioned in the text
 */
export const extractEntityMentions = (text: string): EntityData[] => {
  const mentionedEntities: EntityData[] = [];
  const mentionRegex = /@([\p{L}\p{N}.'-]+)/gu;
  const seenEntityIds = new Set<number>();
  
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionName = match[1];
    const entity = getEntityByMention(mentionName);
    
    if (entity && !seenEntityIds.has(entity.id)) {
      mentionedEntities.push(entity);
      seenEntityIds.add(entity.id);
    }
  }
  
  return mentionedEntities;
};
