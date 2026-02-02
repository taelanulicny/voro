import { docClient, TABLE_NAMES } from '../src/utils/dynamodb';
import { PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Entity, PriceHistory } from '../src/models/types';
import { validateEntityIdsArray } from '../src/utils/idGenerator';
import { BASE_PRICE } from '../src/services/priceCalculationService';

// Entities data synced from frontend src/utils/entities.ts
// EPSILON values are set based on expected daily trading volume per entity
// Higher epsilon = more stable prices (more tokens needed to move price)
// Lower epsilon = more volatile prices (fewer tokens move price more)
// Categories match frontend for consistency
const ENTITIES: Omit<Entity, 'createdAt' | 'updatedAt' | 'positiveTokens' | 'negativeTokens'>[] = [
  // Political Figures (epsilon: 25000-48000 based on prominence)
  { entityId: 10, name: 'Donald Trump', category: 'Political Figures', basePrice: 100, epsilon: 48000, description: 'Former president and political figure. Trade confidence in political influence and electoral prospects.' },
  { entityId: 31, name: 'Joe Biden', category: 'Political Figures', basePrice: 100, epsilon: 45000, description: 'Current president of the United States. Track confidence in Joe Biden\'s policy decisions, approval ratings, and political influence.' },
  { entityId: 32, name: 'Kamala Harris', category: 'Political Figures', basePrice: 100, epsilon: 38000, description: 'Vice President of the United States. Trade confidence in Kamala Harris\'s political standing, policy impact, and future prospects.' },
  { entityId: 33, name: 'Ron DeSantis', category: 'Political Figures', basePrice: 100, epsilon: 32000, description: 'Governor of Florida and political figure. Track confidence in Ron DeSantis\'s political influence, policy decisions, and electoral prospects.' },
  { entityId: 34, name: 'Alexandria Ocasio-Cortez', category: 'Political Figures', basePrice: 100, epsilon: 30000, description: 'U.S. Representative and progressive political figure. Trade confidence in Alexandria Ocasio-Cortez\'s policy advocacy and political influence.' },
  { entityId: 35, name: 'Vivek Ramaswamy', category: 'Political Figures', basePrice: 100, epsilon: 28000, description: 'Entrepreneur and political figure. Track confidence in Vivek Ramaswamy\'s political influence, policy positions, and public profile.' },
  { entityId: 36, name: 'Nikki Haley', category: 'Political Figures', basePrice: 100, epsilon: 30000, description: 'Former U.N. Ambassador and political figure. Trade confidence in Nikki Haley\'s political standing, policy influence, and electoral prospects.' },
  { entityId: 37, name: 'Gavin Newsom', category: 'Political Figures', basePrice: 100, epsilon: 32000, description: 'Governor of California and political figure. Track confidence in Gavin Newsom\'s policy decisions, political influence, and future prospects.' },
  { entityId: 38, name: 'Tucker Carlson', category: 'Political Figures', basePrice: 100, epsilon: 35000, description: 'Media personality and political commentator. Trade confidence in Tucker Carlson\'s influence, media presence, and political impact.' },
  { entityId: 39, name: 'Bernie Sanders', category: 'Political Figures', basePrice: 100, epsilon: 32000, description: 'U.S. Senator and progressive political figure. Track confidence in Bernie Sanders\'s policy advocacy, political influence, and public support.' },
  { entityId: 258, name: 'Barack Obama', category: 'Political Figures', basePrice: 100, epsilon: 45000, description: 'Former president of the United States. Trade confidence in Barack Obama\'s political influence, policy legacy, and public standing.' },
  { entityId: 259, name: 'Zohran Mamdani', category: 'Political Figures', basePrice: 100, epsilon: 22000, description: 'New York State Assembly member and progressive political figure. Track confidence in Zohran Mamdani\'s policy advocacy and political influence.' },
  { entityId: 260, name: 'J.D. Vance', category: 'Political Figures', basePrice: 100, epsilon: 30000, description: 'U.S. Senator and political figure. Trade confidence in J.D. Vance\'s policy positions, political influence, and electoral prospects.' },
  { entityId: 261, name: 'Marco Rubio', category: 'Political Figures', basePrice: 100, epsilon: 32000, description: 'U.S. Senator and political figure. Track confidence in Marco Rubio\'s policy decisions, political influence, and future prospects.' },
  { entityId: 262, name: 'RFK Jr.', category: 'Political Figures', basePrice: 100, epsilon: 28000, description: 'Political figure and environmental activist. Trade confidence in RFK Jr.\'s political influence, policy positions, and public profile.' },
  { entityId: 263, name: 'Mike Johnson', category: 'Political Figures', basePrice: 100, epsilon: 30000, description: 'Speaker of the House and U.S. Representative. Track confidence in Mike Johnson\'s political influence, policy decisions, and leadership.' },
  { entityId: 264, name: 'Hakeem Jeffries', category: 'Political Figures', basePrice: 100, epsilon: 28000, description: 'House Minority Leader and U.S. Representative. Trade confidence in Hakeem Jeffries\'s political influence, policy positions, and leadership.' },
  { entityId: 265, name: 'Benjamin Netanyahu', category: 'Political Figures', basePrice: 100, epsilon: 35000, description: 'Prime Minister of Israel and political figure. Track confidence in Benjamin Netanyahu\'s political influence, policy decisions, and leadership.' },
  { entityId: 266, name: 'Vladimir Putin', category: 'Political Figures', basePrice: 100, epsilon: 40000, description: 'President of Russia and political figure. Trade confidence in Vladimir Putin\'s political influence, policy decisions, and international standing.' },
  { entityId: 267, name: 'Volodymyr Zelensky', category: 'Political Figures', basePrice: 100, epsilon: 38000, description: 'President of Ukraine and political figure. Track confidence in Volodymyr Zelensky\'s leadership, policy decisions, and international support.' },

  // Influencers (epsilon: 25000-48000 based on following)
  { entityId: 11, name: 'Alix Earle', category: 'Influencers', basePrice: 100, epsilon: 35000, description: 'TikTok influencer and content creator. Track confidence in Alix Earle\'s influence, brand partnerships, and audience growth.' },
  { entityId: 12, name: 'MrBeast', category: 'Influencers', basePrice: 100, epsilon: 48000, description: 'YouTube creator and philanthropist. Trade confidence in MrBeast\'s channel growth, business ventures, and social impact initiatives.' },
  { entityId: 14, name: 'Kai Cenat', category: 'Influencers', basePrice: 100, epsilon: 40000, description: 'Twitch streamer and content creator. Trade confidence in Kai Cenat\'s streaming success, audience engagement, and career trajectory.' },
  { entityId: 20, name: 'Charli D\'Amelio', category: 'Influencers', basePrice: 100, epsilon: 42000, description: 'TikTok star and social media influencer. Trade confidence in Charli D\'Amelio\'s influence, brand deals, and career growth.' },
  { entityId: 15, name: 'Logan Paul', category: 'Influencers', basePrice: 100, epsilon: 40000, description: 'YouTube creator, boxer, and entrepreneur. Track confidence in Logan Paul\'s ventures, fight career, and business success.' },
  { entityId: 19, name: 'Jake Paul', category: 'Influencers', basePrice: 100, epsilon: 38000, description: 'YouTube creator, boxer, and entrepreneur. Track confidence in Jake Paul\'s boxing career, business ventures, and public profile.' },
  { entityId: 18, name: 'Alex Cooper', category: 'Influencers', basePrice: 100, epsilon: 35000, description: 'Podcast host and media personality. Trade confidence in Alex Cooper\'s podcast success, brand expansion, and media influence.' },
  { entityId: 16, name: 'Emma Chamberlain', category: 'Influencers', basePrice: 100, epsilon: 36000, description: 'YouTube creator and fashion influencer. Trade confidence in Emma Chamberlain\'s brand partnerships, content creation, and influence.' },
  { entityId: 17, name: 'Adin Ross', category: 'Influencers', basePrice: 100, epsilon: 34000, description: 'Twitch streamer and content creator. Track confidence in Adin Ross\'s streaming career, collaborations, and audience growth.' },
  { entityId: 13, name: 'Andrew Tate', category: 'Influencers', basePrice: 100, epsilon: 35000, description: 'Controversial internet personality and former kickboxer. Track confidence in Andrew Tate\'s influence and media presence.' },
  { entityId: 268, name: 'Joe Rogan', category: 'Influencers', basePrice: 100, epsilon: 45000, description: 'Podcast host, comedian, and UFC commentator. Trade confidence in Joe Rogan\'s podcast success, audience reach, and media influence.' },
  { entityId: 269, name: 'iShowSpeed', category: 'Influencers', basePrice: 100, epsilon: 38000, description: 'YouTube streamer and content creator. Track confidence in iShowSpeed\'s streaming success, viral content, and audience growth.' },
  { entityId: 270, name: 'David Dobrik', category: 'Influencers', basePrice: 100, epsilon: 35000, description: 'YouTube creator and vlogger. Trade confidence in David Dobrik\'s content creation, brand partnerships, and audience engagement.' },
  { entityId: 271, name: 'KSI', category: 'Influencers', basePrice: 100, epsilon: 40000, description: 'YouTube creator, rapper, and boxer. Track confidence in KSI\'s content success, boxing career, and business ventures.' },
  { entityId: 272, name: 'Theo Von', category: 'Influencers', basePrice: 100, epsilon: 32000, description: 'Comedian and podcast host. Trade confidence in Theo Von\'s podcast success, comedy career, and audience growth.' },
  { entityId: 273, name: 'Livvy Dunne', category: 'Influencers', basePrice: 100, epsilon: 34000, description: 'Gymnast and social media influencer. Track confidence in Livvy Dunne\'s athletic career, brand partnerships, and social media influence.' },

  // Pop Music (epsilon: 30000-50000)
  { entityId: 21, name: 'Bad Bunny', category: 'Pop Music', basePrice: 100, epsilon: 45000, description: 'Global reggaeton and Latin trap artist. Trade confidence in Bad Bunny\'s chart success, tours, and cultural impact.' },
  { entityId: 274, name: 'Taylor Swift', category: 'Pop Music', basePrice: 100, epsilon: 50000, description: 'Award-winning singer-songwriter and global pop icon. Track confidence in Taylor Swift\'s album releases, tours, and cultural influence.' },
  { entityId: 275, name: 'Ariana Grande', category: 'Pop Music', basePrice: 100, epsilon: 45000, description: 'Grammy-winning pop superstar. Trade confidence in Ariana Grande\'s chart-topping hits, album releases, and massive global fanbase.' },
  { entityId: 276, name: 'Harry Styles', category: 'Pop Music', basePrice: 100, epsilon: 42000, description: 'Singer-songwriter and former One Direction member. Track confidence in Harry Styles\' solo career, album releases, and cultural impact.' },
  { entityId: 277, name: 'Billie Eilish', category: 'Pop Music', basePrice: 100, epsilon: 44000, description: 'Grammy-winning alternative pop artist. Trade confidence in Billie Eilish\'s chart dominance, album releases, and influence on Gen Z culture.' },
  { entityId: 278, name: 'Dua Lipa', category: 'Pop Music', basePrice: 100, epsilon: 40000, description: 'International pop sensation. Track confidence in Dua Lipa\'s global hits, album releases, and growing influence in the pop music scene.' },
  { entityId: 279, name: 'Olivia Rodrigo', category: 'Pop Music', basePrice: 100, epsilon: 40000, description: 'Rising pop star and songwriter. Trade confidence in Olivia Rodrigo\'s album success, chart performance, and growing fanbase.' },
  { entityId: 280, name: 'The Weeknd', category: 'Pop Music', basePrice: 100, epsilon: 45000, description: 'Grammy-winning pop and R&B artist. Track confidence in The Weeknd\'s chart-topping albums, tours, and cultural influence.' },
  { entityId: 281, name: 'Doja Cat', category: 'Pop Music', basePrice: 100, epsilon: 40000, description: 'Pop and rap crossover artist. Trade confidence in Doja Cat\'s viral hits, album releases, and growing mainstream success.' },
  { entityId: 282, name: 'Ed Sheeran', category: 'Pop Music', basePrice: 100, epsilon: 44000, description: 'Singer-songwriter and global pop star. Track confidence in Ed Sheeran\'s chart-topping albums, world tours, and consistent hit-making.' },
  { entityId: 283, name: 'Bruno Mars', category: 'Pop Music', basePrice: 100, epsilon: 44000, description: 'Grammy-winning pop and R&B artist. Trade confidence in Bruno Mars\' hit singles, album releases, and live performance excellence.' },

  // Rap Music (epsilon: 28000-47000)
  { entityId: 22, name: 'Drake', category: 'Rap Music', basePrice: 100, epsilon: 47000, description: 'Grammy-winning rapper and record producer. Trade confidence in Drake\'s chart dominance, album releases, and business ventures.' },
  { entityId: 23, name: 'Kanye West', category: 'Rap Music', basePrice: 100, epsilon: 45000, description: 'Influential rapper, producer, and fashion designer. Track confidence in Kanye West\'s music releases and brand partnerships.' },
  { entityId: 25, name: 'Travis Scott', category: 'Rap Music', basePrice: 100, epsilon: 42000, description: 'Hip-hop artist and record producer. Track confidence in Travis Scott\'s album releases, collaborations, and live performances.' },
  { entityId: 27, name: 'Playboi Carti', category: 'Rap Music', basePrice: 100, epsilon: 36000, description: 'Rapper and songwriter known for experimental sound. Track confidence in Playboi Carti\'s releases and influence on hip-hop culture.' },
  { entityId: 28, name: 'Ice Spice', category: 'Rap Music', basePrice: 100, epsilon: 35000, description: 'Rising rapper and viral sensation. Trade confidence in Ice Spice\'s chart success, collaborations, and career growth.' },
  { entityId: 240, name: 'Lil Uzi Vert', category: 'Rap Music', basePrice: 100, epsilon: 38000, description: 'Rapper and songwriter known for melodic trap. Track confidence in Lil Uzi Vert\'s album releases, collaborations, and fanbase engagement.' },
  { entityId: 241, name: 'Future', category: 'Rap Music', basePrice: 100, epsilon: 42000, description: 'Rapper, singer, and record producer. Trade confidence in Future\'s chart dominance, album releases, and influence on trap music.' },
  { entityId: 242, name: 'Young Thug', category: 'Rap Music', basePrice: 100, epsilon: 38000, description: 'Rapper, singer, and record executive. Track confidence in Young Thug\'s unique style, album releases, and label success.' },
  { entityId: 243, name: '21 Savage', category: 'Rap Music', basePrice: 100, epsilon: 38000, description: 'Rapper and songwriter. Trade confidence in 21 Savage\'s chart success, album releases, and collaborations.' },
  { entityId: 244, name: 'Lil Baby', category: 'Rap Music', basePrice: 100, epsilon: 40000, description: 'Rapper and songwriter. Track confidence in Lil Baby\'s album releases, chart performance, and rising popularity.' },
  { entityId: 245, name: 'Gunna', category: 'Rap Music', basePrice: 100, epsilon: 35000, description: 'Rapper and songwriter known for melodic trap. Trade confidence in Gunna\'s album releases, collaborations, and fanbase growth.' },
  { entityId: 246, name: 'Don Toliver', category: 'Rap Music', basePrice: 100, epsilon: 32000, description: 'Rapper, singer, and songwriter. Track confidence in Don Toliver\'s melodic rap, album releases, and rising career.' },
  { entityId: 247, name: 'A$AP Rocky', category: 'Rap Music', basePrice: 100, epsilon: 38000, description: 'Rapper, songwriter, and fashion icon. Trade confidence in A$AP Rocky\'s album releases, fashion ventures, and artistic evolution.' },
  { entityId: 248, name: 'Metro Boomin', category: 'Rap Music', basePrice: 100, epsilon: 40000, description: 'Record producer and rapper. Track confidence in Metro Boomin\'s production credits, album releases, and influence in hip-hop.' },
  { entityId: 249, name: 'Tyler, The Creator', category: 'Rap Music', basePrice: 100, epsilon: 40000, description: 'Rapper, singer, producer, and fashion designer. Trade confidence in Tyler, The Creator\'s Grammy-winning music, albums, and creative ventures.' },
  { entityId: 250, name: 'Yeat', category: 'Rap Music', basePrice: 100, epsilon: 32000, description: 'Rapper and songwriter known for experimental sound. Track confidence in Yeat\'s viral success, album releases, and growing fanbase.' },
  { entityId: 251, name: 'Destroy Lonely', category: 'Rap Music', basePrice: 100, epsilon: 28000, description: 'Rapper and songwriter. Trade confidence in Destroy Lonely\'s unique style, album releases, and rising popularity.' },
  { entityId: 252, name: 'Ken Carson', category: 'Rap Music', basePrice: 100, epsilon: 28000, description: 'Rapper and songwriter. Track confidence in Ken Carson\'s album releases, collaborations, and fanbase growth.' },
  { entityId: 253, name: 'J. Cole', category: 'Rap Music', basePrice: 100, epsilon: 44000, description: 'Rapper, singer, and record producer. Trade confidence in J. Cole\'s critically acclaimed albums, storytelling, and label success.' },
  { entityId: 254, name: 'Kendrick Lamar', category: 'Rap Music', basePrice: 100, epsilon: 46000, description: 'Rapper, songwriter, and record producer. Track confidence in Kendrick Lamar\'s Pulitzer Prize-winning music, albums, and artistic impact.' },
  { entityId: 255, name: 'Rod Wave', category: 'Rap Music', basePrice: 100, epsilon: 35000, description: 'Rapper and singer known for melodic rap. Trade confidence in Rod Wave\'s chart success, album releases, and emotional storytelling.' },
  { entityId: 256, name: 'NLE Choppa', category: 'Rap Music', basePrice: 100, epsilon: 30000, description: 'Rapper and songwriter. Track confidence in NLE Choppa\'s viral hits, album releases, and growing popularity.' },
  { entityId: 257, name: 'Baby Keem', category: 'Rap Music', basePrice: 100, epsilon: 32000, description: 'Rapper, singer, and producer. Trade confidence in Baby Keem\'s Grammy-winning music, album releases, and collaborations with Kendrick Lamar.' },

  // Country Music (epsilon: 28000-40000)
  { entityId: 230, name: 'Morgan Wallen', category: 'Country Music', basePrice: 100, epsilon: 42000, description: 'Country music singer and songwriter. Track confidence in Morgan Wallen\'s chart success, album releases, and fanbase growth.' },
  { entityId: 231, name: 'Zach Bryan', category: 'Country Music', basePrice: 100, epsilon: 40000, description: 'Country and Americana singer-songwriter. Trade confidence in Zach Bryan\'s authentic sound, album releases, and rising popularity.' },
  { entityId: 232, name: 'Luke Combs', category: 'Country Music', basePrice: 100, epsilon: 40000, description: 'Country music singer and songwriter. Track confidence in Luke Combs\' hit songs, tours, and continued chart dominance.' },
  { entityId: 233, name: 'Chris Stapleton', category: 'Country Music', basePrice: 100, epsilon: 38000, description: 'Country music singer-songwriter and guitarist. Trade confidence in Chris Stapleton\'s Grammy-winning music and live performances.' },
  { entityId: 234, name: 'Kane Brown', category: 'Country Music', basePrice: 100, epsilon: 36000, description: 'Country music singer and songwriter. Track confidence in Kane Brown\'s crossover success, collaborations, and fan engagement.' },
  { entityId: 235, name: 'Lainey Wilson', category: 'Country Music', basePrice: 100, epsilon: 34000, description: 'Country music singer and songwriter. Trade confidence in Lainey Wilson\'s rising career, award recognition, and hit singles.' },
  { entityId: 236, name: 'Tyler Childers', category: 'Country Music', basePrice: 100, epsilon: 34000, description: 'Country and Americana singer-songwriter. Track confidence in Tyler Childers\' authentic storytelling, album releases, and dedicated fanbase.' },
  { entityId: 237, name: 'Noah Kahan', category: 'Country Music', basePrice: 100, epsilon: 36000, description: 'Singer-songwriter blending folk and country. Trade confidence in Noah Kahan\'s viral success, album releases, and growing popularity.' },
  { entityId: 238, name: 'Luke Bryan', category: 'Country Music', basePrice: 100, epsilon: 38000, description: 'Country music singer and songwriter. Track confidence in Luke Bryan\'s hit songs, tours, and continued presence in country music.' },
  { entityId: 239, name: 'Thomas Rhett', category: 'Country Music', basePrice: 100, epsilon: 35000, description: 'Country music singer and songwriter. Trade confidence in Thomas Rhett\'s chart-topping hits, album releases, and fanbase loyalty.' },

  // Actors (epsilon: 30000-42000)
  { entityId: 50, name: 'Zendaya', category: 'Actors', basePrice: 100, epsilon: 42000, description: 'Award-winning actress and singer. Trade confidence in Zendaya\'s acting career, box office success, and industry influence.' },
  { entityId: 51, name: 'Timothée Chalamet', category: 'Actors', basePrice: 100, epsilon: 40000, description: 'Acclaimed actor known for dramatic roles. Track confidence in Timothée Chalamet\'s film projects, awards recognition, and career trajectory.' },
  { entityId: 52, name: 'Sydney Sweeney', category: 'Actors', basePrice: 100, epsilon: 38000, description: 'Rising actress and producer. Trade confidence in Sydney Sweeney\'s acting roles, production ventures, and industry presence.' },
  { entityId: 53, name: 'Tom Holland', category: 'Actors', basePrice: 100, epsilon: 42000, description: 'Actor best known for Spider-Man franchise. Track confidence in Tom Holland\'s film projects, box office performance, and career growth.' },
  { entityId: 54, name: 'Pedro Pascal', category: 'Actors', basePrice: 100, epsilon: 40000, description: 'Versatile actor in film and television. Trade confidence in Pedro Pascal\'s roles, show success, and entertainment industry impact.' },

  // NBA Players (epsilon: 30000-45000)
  { entityId: 55, name: 'LeBron James', category: 'NBA Players', basePrice: 100, epsilon: 45000, description: 'NBA superstar and all-time great. Trade confidence in LeBron James\'s performance, team success, and legacy in basketball.' },
  { entityId: 56, name: 'Stephen Curry', category: 'NBA Players', basePrice: 100, epsilon: 44000, description: 'Three-point shooting legend and Warriors icon. Track confidence in Stephen Curry\'s shooting, team performance, and career milestones.' },
  { entityId: 57, name: 'Victor Wembanyama', category: 'NBA Players', basePrice: 100, epsilon: 40000, description: 'Rising star and generational talent. Trade confidence in Victor Wembanyama\'s development, rookie performance, and future potential.' },
  { entityId: 58, name: 'Nikola Jokic', category: 'NBA Players', basePrice: 100, epsilon: 42000, description: 'Reigning MVP and elite center. Track confidence in Nikola Jokic\'s playmaking, team success, and championship aspirations.' },
  { entityId: 59, name: 'Luka Dončić', category: 'NBA Players', basePrice: 100, epsilon: 42000, description: 'Dynamic guard and triple-double machine. Trade confidence in Luka Dončić\'s scoring, assists, and Mavericks success.' },
  { entityId: 60, name: 'Anthony Edwards', category: 'NBA Players', basePrice: 100, epsilon: 38000, description: 'Explosive guard and rising star. Track confidence in Anthony Edwards\'s scoring ability, team leadership, and playoff performance.' },
  { entityId: 61, name: 'Shai Gilgeous-Alexander', category: 'NBA Players', basePrice: 100, epsilon: 38000, description: 'Elite guard and Thunder leader. Trade confidence in Shai Gilgeous-Alexander\'s scoring, team building, and All-Star status.' },

  // NFL Players (epsilon: 30000-42000)
  { entityId: 62, name: 'Patrick Mahomes', category: 'NFL Players', basePrice: 100, epsilon: 42000, description: 'Super Bowl champion quarterback and Chiefs leader. Trade confidence in Patrick Mahomes\'s performance, team success, and MVP potential.' },
  { entityId: 63, name: 'Drake Maye', category: 'NFL Players', basePrice: 100, epsilon: 30000, description: 'Rising quarterback prospect. Track confidence in Drake Maye\'s development, draft position, and NFL career trajectory.' },
  { entityId: 64, name: 'Joe Burrow', category: 'NFL Players', basePrice: 100, epsilon: 40000, description: 'Elite quarterback and Bengals leader. Trade confidence in Joe Burrow\'s passing, playoff performance, and championship aspirations.' },
  { entityId: 65, name: 'Travis Kelce', category: 'NFL Players', basePrice: 100, epsilon: 42000, description: 'All-Pro tight end and Chiefs star. Track confidence in Travis Kelce\'s receiving, team chemistry, and Super Bowl success.' },
  { entityId: 66, name: 'Caleb Williams', category: 'NFL Players', basePrice: 100, epsilon: 32000, description: 'Top quarterback prospect and Heisman winner. Trade confidence in Caleb Williams\'s draft stock, NFL readiness, and future potential.' },
  { entityId: 69, name: 'Tom Brady', category: 'NFL Players', basePrice: 100, epsilon: 45000, description: 'Seven-time Super Bowl champion and greatest quarterback of all time. Trade confidence in Tom Brady\'s legacy, retirement impact, and post-career ventures.' },

  // Soccer Players (epsilon: 40000-48000)
  { entityId: 67, name: 'Lionel Messi', category: 'Soccer Players', basePrice: 100, epsilon: 48000, description: 'World Cup champion and football legend. Trade confidence in Lionel Messi\'s performance, team success, and legacy in soccer.' },
  { entityId: 68, name: 'Cristiano Ronaldo', category: 'Soccer Players', basePrice: 100, epsilon: 48000, description: 'Global football icon and goal-scoring machine. Track confidence in Cristiano Ronaldo\'s goals, team impact, and career milestones.' },

  // NFL Teams (epsilon: 35000-45000)
  { entityId: 100, name: 'Kansas City Chiefs', category: 'NFL Teams', basePrice: 100, epsilon: 45000, description: 'NFL team based in Kansas City. Track confidence in the Chiefs\' performance, playoff prospects, and fan engagement.' },
  { entityId: 101, name: 'Buffalo Bills', category: 'NFL Teams', basePrice: 100, epsilon: 42000, description: 'NFL team based in Buffalo. Trade confidence in the Bills\' season performance, playoff chances, and team success.' },
  { entityId: 102, name: 'Baltimore Ravens', category: 'NFL Teams', basePrice: 100, epsilon: 42000, description: 'NFL team based in Baltimore. Track confidence in the Ravens\' performance, roster strength, and championship potential.' },
  { entityId: 103, name: 'Cincinnati Bengals', category: 'NFL Teams', basePrice: 100, epsilon: 40000, description: 'NFL team based in Cincinnati. Trade confidence in the Bengals\' season outlook, player performance, and playoff aspirations.' },
  { entityId: 104, name: 'Cleveland Browns', category: 'NFL Teams', basePrice: 100, epsilon: 38000, description: 'NFL team based in Cleveland. Track confidence in the Browns\' performance, roster decisions, and season success.' },
  { entityId: 105, name: 'Pittsburgh Steelers', category: 'NFL Teams', basePrice: 100, epsilon: 42000, description: 'NFL team based in Pittsburgh. Trade confidence in the Steelers\' tradition, team performance, and playoff chances.' },
  { entityId: 106, name: 'Houston Texans', category: 'NFL Teams', basePrice: 100, epsilon: 36000, description: 'NFL team based in Houston. Track confidence in the Texans\' rebuilding process, draft picks, and future success.' },
  { entityId: 107, name: 'Indianapolis Colts', category: 'NFL Teams', basePrice: 100, epsilon: 38000, description: 'NFL team based in Indianapolis. Trade confidence in the Colts\' performance, quarterback situation, and season outlook.' },
  { entityId: 108, name: 'Jacksonville Jaguars', category: 'NFL Teams', basePrice: 100, epsilon: 36000, description: 'NFL team based in Jacksonville. Track confidence in the Jaguars\' development, young talent, and competitive progress.' },
  { entityId: 109, name: 'Tennessee Titans', category: 'NFL Teams', basePrice: 100, epsilon: 36000, description: 'NFL team based in Tennessee. Trade confidence in the Titans\' performance, coaching decisions, and playoff potential.' },
  { entityId: 110, name: 'Denver Broncos', category: 'NFL Teams', basePrice: 100, epsilon: 38000, description: 'NFL team based in Denver. Track confidence in the Broncos\' roster moves, quarterback play, and season performance.' },
  { entityId: 111, name: 'Los Angeles Chargers', category: 'NFL Teams', basePrice: 100, epsilon: 40000, description: 'NFL team based in Los Angeles. Trade confidence in the Chargers\' talent, playoff chances, and championship aspirations.' },
  { entityId: 112, name: 'Los Angeles Rams', category: 'NFL Teams', basePrice: 100, epsilon: 40000, description: 'NFL team based in Los Angeles. Track confidence in the Rams\' roster construction, coaching, and competitive success.' },
  { entityId: 113, name: 'Las Vegas Raiders', category: 'NFL Teams', basePrice: 100, epsilon: 38000, description: 'NFL team based in Las Vegas. Trade confidence in the Raiders\' performance, team culture, and playoff prospects.' },
  { entityId: 114, name: 'Dallas Cowboys', category: 'NFL Teams', basePrice: 100, epsilon: 45000, description: 'NFL team based in Dallas. Track confidence in the Cowboys\' performance, playoff success, and championship potential.' },
  { entityId: 115, name: 'New York Giants', category: 'NFL Teams', basePrice: 100, epsilon: 40000, description: 'NFL team based in New York. Trade confidence in the Giants\' rebuilding efforts, draft strategy, and future success.' },
  { entityId: 116, name: 'Philadelphia Eagles', category: 'NFL Teams', basePrice: 100, epsilon: 44000, description: 'NFL team based in Philadelphia. Track confidence in the Eagles\' performance, roster depth, and Super Bowl chances.' },
  { entityId: 117, name: 'Washington Commanders', category: 'NFL Teams', basePrice: 100, epsilon: 36000, description: 'NFL team based in Washington. Trade confidence in the Commanders\' rebuild, new ownership, and team development.' },
  { entityId: 118, name: 'Chicago Bears', category: 'NFL Teams', basePrice: 100, epsilon: 40000, description: 'NFL team based in Chicago. Track confidence in the Bears\' quarterback development, roster building, and competitive progress.' },
  { entityId: 119, name: 'Detroit Lions', category: 'NFL Teams', basePrice: 100, epsilon: 42000, description: 'NFL team based in Detroit. Trade confidence in the Lions\' resurgence, coaching success, and playoff performance.' },
  { entityId: 120, name: 'Green Bay Packers', category: 'NFL Teams', basePrice: 100, epsilon: 44000, description: 'NFL team based in Green Bay. Track confidence in the Packers\' quarterback transition, team performance, and playoff chances.' },
  { entityId: 121, name: 'Minnesota Vikings', category: 'NFL Teams', basePrice: 100, epsilon: 40000, description: 'NFL team based in Minnesota. Trade confidence in the Vikings\' performance, roster decisions, and competitive success.' },
  { entityId: 122, name: 'Atlanta Falcons', category: 'NFL Teams', basePrice: 100, epsilon: 36000, description: 'NFL team based in Atlanta. Track confidence in the Falcons\' rebuild, quarterback situation, and future prospects.' },
  { entityId: 123, name: 'Carolina Panthers', category: 'NFL Teams', basePrice: 100, epsilon: 35000, description: 'NFL team based in Carolina. Trade confidence in the Panthers\' rebuilding process, draft picks, and team development.' },
  { entityId: 124, name: 'New Orleans Saints', category: 'NFL Teams', basePrice: 100, epsilon: 38000, description: 'NFL team based in New Orleans. Track confidence in the Saints\' performance, roster management, and playoff aspirations.' },
  { entityId: 125, name: 'Tampa Bay Buccaneers', category: 'NFL Teams', basePrice: 100, epsilon: 40000, description: 'NFL team based in Tampa Bay. Trade confidence in the Buccaneers\' performance, quarterback situation, and competitive success.' },
  { entityId: 126, name: 'Arizona Cardinals', category: 'NFL Teams', basePrice: 100, epsilon: 35000, description: 'NFL team based in Arizona. Track confidence in the Cardinals\' rebuild, draft strategy, and future development.' },
  { entityId: 127, name: 'San Francisco 49ers', category: 'NFL Teams', basePrice: 100, epsilon: 44000, description: 'NFL team based in San Francisco. Trade confidence in the 49ers\' roster talent, coaching, and Super Bowl potential.' },
  { entityId: 128, name: 'Seattle Seahawks', category: 'NFL Teams', basePrice: 100, epsilon: 40000, description: 'NFL team based in Seattle. Track confidence in the Seahawks\' performance, quarterback play, and playoff chances.' },
  { entityId: 129, name: 'New England Patriots', category: 'NFL Teams', basePrice: 100, epsilon: 42000, description: 'NFL team based in New England. Trade confidence in the Patriots\' rebuild, coaching decisions, and future success.' },
  { entityId: 130, name: 'New York Jets', category: 'NFL Teams', basePrice: 100, epsilon: 40000, description: 'NFL team based in New York. Track confidence in the Jets\' quarterback situation, roster talent, and competitive progress.' },
  { entityId: 131, name: 'Miami Dolphins', category: 'NFL Teams', basePrice: 100, epsilon: 42000, description: 'NFL team based in Miami. Trade confidence in the Dolphins\' offensive performance, playoff chances, and team success.' },

  // NBA Teams (epsilon: 35000-45000)
  { entityId: 200, name: 'Boston Celtics', category: 'NBA Teams', basePrice: 100, epsilon: 45000, description: 'NBA team based in Boston. Track confidence in the Celtics\' performance, playoff prospects, and championship potential.' },
  { entityId: 201, name: 'Milwaukee Bucks', category: 'NBA Teams', basePrice: 100, epsilon: 42000, description: 'NBA team based in Milwaukee. Trade confidence in the Bucks\' roster talent, star players, and title chances.' },
  { entityId: 202, name: 'Denver Nuggets', category: 'NBA Teams', basePrice: 100, epsilon: 44000, description: 'NBA team based in Denver. Track confidence in the Nuggets\' championship core, coaching, and competitive success.' },
  { entityId: 203, name: 'Phoenix Suns', category: 'NBA Teams', basePrice: 100, epsilon: 42000, description: 'NBA team based in Phoenix. Trade confidence in the Suns\' star power, roster depth, and playoff performance.' },
  { entityId: 204, name: 'Los Angeles Lakers', category: 'NBA Teams', basePrice: 100, epsilon: 45000, description: 'NBA team based in Los Angeles. Track confidence in the Lakers\' legacy, star players, and championship aspirations.' },
  { entityId: 205, name: 'Golden State Warriors', category: 'NBA Teams', basePrice: 100, epsilon: 45000, description: 'NBA team based in San Francisco. Trade confidence in the Warriors\' dynasty, shooting, and title contention.' },
  { entityId: 206, name: 'Philadelphia 76ers', category: 'NBA Teams', basePrice: 100, epsilon: 42000, description: 'NBA team based in Philadelphia. Track confidence in the 76ers\' star talent, team chemistry, and playoff success.' },
  { entityId: 207, name: 'Miami Heat', category: 'NBA Teams', basePrice: 100, epsilon: 42000, description: 'NBA team based in Miami. Trade confidence in the Heat\'s culture, coaching, and playoff resilience.' },
  { entityId: 208, name: 'Dallas Mavericks', category: 'NBA Teams', basePrice: 100, epsilon: 42000, description: 'NBA team based in Dallas. Track confidence in the Mavericks\' star duo, offensive firepower, and playoff potential.' },
  { entityId: 209, name: 'Cleveland Cavaliers', category: 'NBA Teams', basePrice: 100, epsilon: 40000, description: 'NBA team based in Cleveland. Trade confidence in the Cavaliers\' young core, development, and competitive progress.' },
  { entityId: 210, name: 'New York Knicks', category: 'NBA Teams', basePrice: 100, epsilon: 44000, description: 'NBA team based in New York. Track confidence in the Knicks\' rebuild, roster moves, and playoff chances.' },
  { entityId: 211, name: 'Los Angeles Clippers', category: 'NBA Teams', basePrice: 100, epsilon: 42000, description: 'NBA team based in Los Angeles. Trade confidence in the Clippers\' star talent, depth, and championship window.' },
  { entityId: 212, name: 'Oklahoma City Thunder', category: 'NBA Teams', basePrice: 100, epsilon: 42000, description: 'NBA team based in Oklahoma City. Track confidence in the Thunder\'s young stars, rebuild, and future potential.' },
  { entityId: 213, name: 'Minnesota Timberwolves', category: 'NBA Teams', basePrice: 100, epsilon: 40000, description: 'NBA team based in Minnesota. Trade confidence in the Timberwolves\' roster construction and playoff performance.' },
  { entityId: 214, name: 'Sacramento Kings', category: 'NBA Teams', basePrice: 100, epsilon: 38000, description: 'NBA team based in Sacramento. Track confidence in the Kings\' offensive system, young talent, and competitive growth.' },
  { entityId: 215, name: 'New Orleans Pelicans', category: 'NBA Teams', basePrice: 100, epsilon: 38000, description: 'NBA team based in New Orleans. Trade confidence in the Pelicans\' young stars, depth, and playoff aspirations.' },
  { entityId: 216, name: 'Atlanta Hawks', category: 'NBA Teams', basePrice: 100, epsilon: 38000, description: 'NBA team based in Atlanta. Track confidence in the Hawks\' backcourt, roster moves, and playoff contention.' },
  { entityId: 217, name: 'Chicago Bulls', category: 'NBA Teams', basePrice: 100, epsilon: 40000, description: 'NBA team based in Chicago. Trade confidence in the Bulls\' roster, coaching, and competitive direction.' },
  { entityId: 218, name: 'Toronto Raptors', category: 'NBA Teams', basePrice: 100, epsilon: 38000, description: 'NBA team based in Toronto. Track confidence in the Raptors\' rebuild, young talent, and future development.' },
  { entityId: 219, name: 'Indiana Pacers', category: 'NBA Teams', basePrice: 100, epsilon: 38000, description: 'NBA team based in Indiana. Trade confidence in the Pacers\' fast-paced offense, young core, and growth.' },
  { entityId: 220, name: 'Orlando Magic', category: 'NBA Teams', basePrice: 100, epsilon: 38000, description: 'NBA team based in Orlando. Track confidence in the Magic\'s young talent, defensive identity, and rebuild progress.' },
  { entityId: 221, name: 'Washington Wizards', category: 'NBA Teams', basePrice: 100, epsilon: 35000, description: 'NBA team based in Washington. Trade confidence in the Wizards\' rebuild, draft strategy, and future direction.' },
  { entityId: 222, name: 'Charlotte Hornets', category: 'NBA Teams', basePrice: 100, epsilon: 35000, description: 'NBA team based in Charlotte. Track confidence in the Hornets\' young stars, development, and competitive progress.' },
  { entityId: 223, name: 'Detroit Pistons', category: 'NBA Teams', basePrice: 100, epsilon: 36000, description: 'NBA team based in Detroit. Trade confidence in the Pistons\' rebuild, young core, and future potential.' },
  { entityId: 224, name: 'Brooklyn Nets', category: 'NBA Teams', basePrice: 100, epsilon: 40000, description: 'NBA team based in Brooklyn. Track confidence in the Nets\' rebuild, roster moves, and competitive direction.' },
  { entityId: 225, name: 'Utah Jazz', category: 'NBA Teams', basePrice: 100, epsilon: 36000, description: 'NBA team based in Utah. Trade confidence in the Jazz\'s rebuild, young talent, and development strategy.' },
  { entityId: 226, name: 'Portland Trail Blazers', category: 'NBA Teams', basePrice: 100, epsilon: 36000, description: 'NBA team based in Portland. Track confidence in the Trail Blazers\' rebuild, draft picks, and future direction.' },
  { entityId: 227, name: 'Houston Rockets', category: 'NBA Teams', basePrice: 100, epsilon: 38000, description: 'NBA team based in Houston. Trade confidence in the Rockets\' young core, development, and rebuild progress.' },
  { entityId: 228, name: 'Memphis Grizzlies', category: 'NBA Teams', basePrice: 100, epsilon: 42000, description: 'NBA team based in Memphis. Track confidence in the Grizzlies\' young stars, culture, and competitive potential.' },
  { entityId: 229, name: 'San Antonio Spurs', category: 'NBA Teams', basePrice: 100, epsilon: 40000, description: 'NBA team based in San Antonio. Trade confidence in the Spurs\' rebuild, young talent, and future development.' },

  // Test entity
  { entityId: 999, name: 'test_entity', category: 'Actors', basePrice: 100, epsilon: 20000, description: 'Test entity for development and testing purposes.' },
];

async function seedEntities() {
  console.log('Seeding entities...');
  
  // Validate entity IDs are unique before seeding
  const validation = validateEntityIdsArray(ENTITIES);
  if (!validation.isValid) {
    console.error('❌ ERROR: Duplicate entity IDs found:', validation.duplicates);
    throw new Error(`Duplicate entity IDs found: ${validation.duplicates.join(', ')}`);
  }
  console.log('✅ Entity IDs validated: all unique');
  
  const now = new Date().toISOString();
  const entities: Entity[] = ENTITIES.map(e => ({
    ...e,
    positiveTokens: 0, // Initialize pools
    negativeTokens: 0,
    createdAt: now,
    updatedAt: now,
  }));

  // Batch write entities (DynamoDB batch write limit is 25 items)
  for (let i = 0; i < entities.length; i += 25) {
    const batch = entities.slice(i, i + 25);
    const requests = batch.map(entity => ({
      PutRequest: {
        Item: entity,
      },
    }));

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAMES.ENTITIES]: requests,
        },
      })
    );
    
    console.log(`Seeded ${Math.min(i + 25, entities.length)}/${entities.length} entities`);
  }

  console.log('Entities seeded successfully!');
}

async function seedInitialPrices() {
  console.log('Seeding initial prices...');
  
  const now = new Date().toISOString();
  
  for (const entity of ENTITIES) {
    // Start with BASE_PRICE (100) plus small random variation
    const variation = (Math.random() - 0.5) * 8; // -4 to +4 range
    const initialPrice = Math.round((BASE_PRICE + variation) * 100) / 100;

    const priceHistory: PriceHistory = {
      entityId: entity.entityId,
      timestamp: now,
      price: initialPrice,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.PRICE_HISTORY,
        Item: priceHistory,
      })
    );
  }

  console.log('Initial prices seeded successfully!');
}

async function main() {
  try {
    await seedEntities();
    await seedInitialPrices();
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

