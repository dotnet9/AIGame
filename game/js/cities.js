// 城市巡游数据：52 城 × 2~3 个介绍版本（常来常新）
// 每城：中英文名、主题色、地标原型（world.js 按类型拼装低模）、特产、名校(985/211)、版本化介绍
// variants 按到访次数轮换：第 1 次讲熊猫、第 2 次讲火锅……复访城市常看常新
export const CITIES = [
  {
    id: 'beijing', name: '北京', en: 'Beijing', color: '#C8402F', landmark: 'gate',
    specialties: ['烤鸭', '糖葫芦'],
    unis: [
      { zh: '清华大学', en: 'Tsinghua University', tag: '985' },
      { zh: '北京大学', en: 'Peking University', tag: '985' },
      { zh: '中国人民大学', en: 'Renmin University of China', tag: '985' },
      { zh: '北京师范大学', en: 'Beijing Normal University', tag: '985' },
      { zh: '北京航空航天大学', en: 'Beihang University', tag: '985' },
      { zh: '北京理工大学', en: 'Beijing Institute of Technology', tag: '985' },
      { zh: '北京外国语大学', en: 'Beijing Foreign Studies University', tag: '211' },
      { zh: '中央财经大学', en: 'Central University of Finance and Economics', tag: '211' },
    ],
    variants: [
      { emoji: '🏛️', intro: '我们的首都！天安门和雄伟的长城都在这里', introEn: 'Beijing is the capital of China.', words: ['capital', 'wall'], deco: 'lantern' },
      { emoji: '🦆', intro: '北京烤鸭皮脆肉嫩，闻名全世界', introEn: 'Beijing roast duck is famous around the world.', words: ['duck'], deco: 'lantern' },
      { emoji: '🏮', intro: '胡同里藏着老北京的叫卖声和糖葫芦', introEn: 'Old hutongs are full of stories.', words: ['story'], deco: 'lantern' },
    ],
  },
  {
    id: 'shanghai', name: '上海', en: 'Shanghai', color: '#3E7CB1', landmark: 'tower',
    specialties: ['小笼包', '大白兔奶糖'],
    unis: [
      { zh: '复旦大学', en: 'Fudan University', tag: '985' },
      { zh: '上海交通大学', en: 'Shanghai Jiao Tong University', tag: '985' },
      { zh: '同济大学', en: 'Tongji University', tag: '985' },
      { zh: '华东师范大学', en: 'East China Normal University', tag: '985' },
      { zh: '上海外国语大学', en: 'Shanghai International Studies University', tag: '211' },
    ],
    variants: [
      { emoji: '🌆', intro: '东方明珠塔在黄浦江边闪闪发光', introEn: 'The Oriental Pearl Tower shines by the river.', words: ['tower', 'light'], deco: 'boat' },
      { emoji: '🥟', intro: '小笼包要先开窗、再喝汤，小心烫！', introEn: 'Xiaolongbao soup dumplings are so hot!', words: ['soup'], deco: 'boat' },
      { emoji: '🚢', intro: '大船在港口进进出出，上海是超级大港', introEn: 'Shanghai has one of the biggest ports.', words: ['ship'], deco: 'boat' },
    ],
  },
  {
    id: 'tianjin', name: '天津', en: 'Tianjin', color: '#5B8C5A', landmark: 'harbor',
    specialties: ['狗不理包子', '麻花'],
    unis: [
      { zh: '南开大学', en: 'Nankai University', tag: '985' },
      { zh: '天津大学', en: 'Tianjin University', tag: '985' },
    ],
    variants: [
      { emoji: '🎡', intro: '天津之眼摩天轮就架在大桥上', introEn: 'The Tianjin Eye sits on a bridge!', words: ['wheel'], deco: 'boat' },
      { emoji: '🥟', intro: '狗不理包子皮薄馅大十八个褶', introEn: 'Goubuli baozi is a famous snack.', words: ['baozi'], deco: 'boat' },
    ],
  },
  {
    id: 'chongqing', name: '重庆', en: 'Chongqing', color: '#B4533A', landmark: 'mountain',
    specialties: ['火锅', '小面'],
    unis: [
      { zh: '重庆大学', en: 'Chongqing University', tag: '985' },
      { zh: '西南大学', en: 'Southwest University', tag: '211' },
    ],
    variants: [
      { emoji: '🌶️', intro: '火锅之都！红油咕嘟咕嘟冒着泡', introEn: 'Chongqing hotpot is super spicy!', words: ['hot', 'spicy'], deco: 'chili' },
      { emoji: '🌉', intro: '山城夜景像星星落进了江里', introEn: 'The mountain city glows at night.', words: ['night', 'light'], deco: 'chili' },
    ],
  },
  {
    id: 'chengdu', name: '成都', en: 'Chengdu', color: '#B85A7A', landmark: 'panda',
    specialties: ['火锅', '熊猫玩偶'],
    unis: [
      { zh: '四川大学', en: 'Sichuan University', tag: '985' },
      { zh: '电子科技大学', en: 'University of Electronic Science and Technology of China', tag: '985' },
      { zh: '西南交通大学', en: 'Southwest Jiaotong University', tag: '211' },
    ],
    variants: [
      { emoji: '🐼', intro: '大熊猫的家乡，繁殖基地里滚滚在打滚', introEn: 'Chengdu is home to giant pandas.', words: ['panda', 'bamboo'], deco: 'bamboo' },
      { emoji: '🌶️', intro: '火锅之都，麻辣鲜香 Red and spicy!', introEn: 'Chengdu is famous for spicy hotpot.', words: ['hot', 'spicy'], deco: 'chili' },
      { emoji: '🎭', intro: '茶馆里的变脸绝活，一张脸说变就变', introEn: 'Face-changing shows amaze everyone.', words: ['tea', 'face'], deco: 'lantern' },
    ],
  },
  {
    id: 'hangzhou', name: '杭州', en: 'Hangzhou', color: '#4E9E7F', landmark: 'pavilion',
    specialties: ['龙井茶', '西湖醋鱼'],
    unis: [
      { zh: '浙江大学', en: 'Zhejiang University', tag: '985' },
      { zh: '中国美术学院', en: 'China Academy of Art', tag: '' },
    ],
    variants: [
      { emoji: '🍵', intro: '西湖边采龙井茶，泡泡更香', introEn: 'Longjing tea grows by West Lake.', words: ['tea'], deco: 'tea' },
      { emoji: '🌉', intro: '断桥上白娘子和许仙相遇的故事', introEn: 'The Broken Bridge has a love story.', words: ['bridge'], deco: 'flower' },
    ],
  },
  {
    id: 'nanjing', name: '南京', en: 'Nanjing', color: '#7B6BA8', landmark: 'wall',
    specialties: ['盐水鸭', '雨花石'],
    unis: [
      { zh: '南京大学', en: 'Nanjing University', tag: '985' },
      { zh: '东南大学', en: 'Southeast University', tag: '985' },
      { zh: '南京航空航天大学', en: 'Nanjing University of Aeronautics', tag: '211' },
      { zh: '南京师范大学', en: 'Nanjing Normal University', tag: '211' },
    ],
    variants: [
      { emoji: '🧱', intro: '明城墙加起来有 35 公里长', introEn: 'The old city wall is very very long.', words: ['wall'], deco: 'lantern' },
      { emoji: '🦆', intro: '盐水鸭是南京人的心头好', introEn: 'Salted duck is a local favorite.', words: ['duck'], deco: 'flower' },
    ],
  },
  {
    id: 'suzhou', name: '苏州', en: 'Suzhou', color: '#6B9EA8', landmark: 'pavilion',
    specialties: ['苏式糕点', '丝绸'],
    unis: [
      { zh: '苏州大学', en: 'Soochow University', tag: '211' },
    ],
    variants: [
      { emoji: '🏮', intro: '园林里一步一景，像走进画里', introEn: 'Suzhou gardens are like paintings.', words: ['garden'], deco: 'flower' },
      { emoji: '🧵', intro: '苏州刺绣细得能在丝线上开花', introEn: 'Suzhou silk is soft and shiny.', words: ['silk'], deco: 'flower' },
    ],
  },
  {
    id: 'wuxi', name: '无锡', en: 'Wuxi', color: '#5A8FBF', landmark: 'harbor',
    specialties: ['小笼包', '酱排骨'],
    unis: [
      { zh: '江南大学', en: 'Jiangnan University', tag: '211' },
    ],
    variants: [
      { emoji: '💴', intro: '太湖的浪把月亮摇碎了', introEn: 'Lake Tai is big and beautiful.', words: ['lake'], deco: 'boat' },
      { emoji: '🍖', intro: '酱排骨甜甜的，是无锡的味道', introEn: 'Wuxi ribs taste sweet.', words: ['sweet'], deco: 'boat' },
    ],
  },
  {
    id: 'ningbo', name: '宁波', en: 'Ningbo', color: '#3E8FB0', landmark: 'harbor',
    specialties: ['汤圆', '海鲜'],
    unis: [
      { zh: '宁波大学', en: 'Ningbo University', tag: '211' },
    ],
    variants: [
      { emoji: '🥣', intro: '猪油汤圆黑芝麻馅会流心', introEn: 'Sticky rice balls are sweet!', words: ['sweet'], deco: 'boat' },
      { emoji: '⚓', intro: '千年老港口，船开去全世界', introEn: 'Ningbo is an ancient big port.', words: ['port'], deco: 'boat' },
    ],
  },
  {
    id: 'wenzhou', name: '温州', en: 'Wenzhou', color: '#4E8FA0', landmark: 'harbor',
    specialties: ['鱼丸', '瓯柑'],
    unis: [],
    variants: [
      { emoji: '👟', intro: '全世界的鞋很多都是温州造的', introEn: 'Wenzhou makes lots of shoes!', words: ['shoe'], deco: 'boat' },
      { emoji: '🌊', intro: '瓯江入海，江蟹肥美', introEn: 'The Ou river meets the sea here.', words: ['crab'], deco: 'boat' },
    ],
  },
  {
    id: 'hefei', name: '合肥', en: 'Hefei', color: '#5E8A5E', landmark: 'tower',
    specialties: ['小龙虾', '庐州烤鸭'],
    unis: [
      { zh: '中国科学技术大学', en: 'University of Science and Technology of China', tag: '985' },
      { zh: '合肥工业大学', en: 'Hefei University of Technology', tag: '211' },
    ],
    variants: [
      { emoji: '🚀', intro: '科学岛上的大科学装置在探索宇宙', introEn: 'Hefei is a city of science!', words: ['science'], deco: 'lantern' },
      { emoji: '🦞', intro: '夏天的合肥满街都是小龙虾香', introEn: 'Crayfish is a summer favorite.', words: ['crab'], deco: 'lantern' },
    ],
  },
  {
    id: 'huangshan', name: '黄山', en: 'Huangshan', color: '#8A9A5B', landmark: 'mountain',
    specialties: ['毛豆腐', '茶叶'],
    unis: [],
    variants: [
      { emoji: '⛰️', intro: '奇松、怪石、云海，黄山归来不看山', introEn: 'The Yellow Mountain has a sea of clouds.', words: ['mountain', 'cloud'], deco: 'flower' },
      { emoji: '🌲', intro: '迎客松站在悬崖边朝你招手', introEn: 'The Guest-Greeting Pine waves at you!', words: ['tree'], deco: 'tea' },
    ],
  },
  {
    id: 'xiamen', name: '厦门', en: 'Xiamen', color: '#4EA8A0', landmark: 'pavilion',
    specialties: ['沙茶面', '海蛎煎'],
    unis: [
      { zh: '厦门大学', en: 'Xiamen University', tag: '985' },
    ],
    variants: [
      { emoji: '🏝️', intro: '鼓浪屿的小巷里都是钢琴声', introEn: 'Gulangyu island is full of piano music.', words: ['island', 'music'], deco: 'shell' },
      { emoji: '🎓', intro: '厦大被称为中国最美的大学', introEn: 'Xiamen University is super beautiful.', words: ['beautiful'], deco: 'shell' },
    ],
  },
  {
    id: 'fuzhou', name: '福州', en: 'Fuzhou', color: '#5B9E6B', landmark: 'harbor',
    specialties: ['佛跳墙', '鱼丸'],
    unis: [
      { zh: '福州大学', en: 'Fuzhou University', tag: '211' },
    ],
    variants: [
      { emoji: '🌳', intro: '满城的榕树像一把把大伞', introEn: 'Big banyan trees cover the city.', words: ['tree'], deco: 'tea' },
      { emoji: '🍲', intro: '佛跳墙香得连佛都跳墙来尝', introEn: 'Buddha Jumps Over the Wall soup!', words: ['soup'], deco: 'tea' },
    ],
  },
  {
    id: 'quanzhou', name: '泉州', en: 'Quanzhou', color: '#A87F52', landmark: 'pavilion',
    specialties: ['面线糊', '润饼'],
    unis: [],
    variants: [
      { emoji: '🚢', intro: '古代海上丝绸之路从这里出发', introEn: 'Ancient ships sailed from Quanzhou.', words: ['ship'], deco: 'lantern' },
      { emoji: '🎭', intro: '提线木偶在艺人手里活了过来', introEn: 'Puppet shows are so fun here!', words: ['show'], deco: 'lantern' },
    ],
  },
  {
    id: 'nanchang', name: '南昌', en: 'Nanchang', color: '#B0704E', landmark: 'pavilion',
    specialties: ['瓦罐汤', '拌粉'],
    unis: [
      { zh: '南昌大学', en: 'Nanchang University', tag: '211' },
    ],
    variants: [
      { emoji: '🏯', intro: '滕王阁上能看到赣江大转弯', introEn: 'Tengwang Pavilion overlooks the river.', words: ['river'], deco: 'lantern' },
      { emoji: '🍲', intro: '瓦罐汤煨一夜，鲜得掉眉毛', introEn: 'Clay pot soup is tasty!', words: ['soup'], deco: 'lantern' },
    ],
  },
  {
    id: 'qingdao', name: '青岛', en: 'Qingdao', color: '#3E86A8', landmark: 'harbor',
    specialties: ['海鲜', '崂山矿泉水'],
    unis: [
      { zh: '中国海洋大学', en: 'Ocean University of China', tag: '985' },
    ],
    variants: [
      { emoji: '🏖️', intro: '红瓦绿树、碧海蓝天说的就是青岛', introEn: 'Red roofs and blue sea in Qingdao.', words: ['sea', 'beach'], deco: 'shell' },
      { emoji: '🐦', intro: '栈桥边的海鸥会追着浪飞', introEn: 'Seagulls fly over the Zhanqiao pier.', words: ['bird'], deco: 'shell' },
    ],
  },
  {
    id: 'jinan', name: '济南', en: 'Jinan', color: '#5B8FA8', landmark: 'pavilion',
    specialties: ['把子肉', '甜沫'],
    unis: [
      { zh: '山东大学', en: 'Shandong University', tag: '985' },
    ],
    variants: [
      { emoji: '⛲', intro: '七十二名泉，趵突泉咕嘟咕嘟冒了千年', introEn: 'Baotu Spring bubbles day and night.', words: ['spring', 'water'], deco: 'tea' },
      { emoji: '🌿', intro: '家家泉水、户户垂杨，老城像江南', introEn: 'Springs run through the old town.', words: ['town'], deco: 'flower' },
    ],
  },
  {
    id: 'yantai', name: '烟台', en: 'Yantai', color: '#4E9E8A', landmark: 'harbor',
    specialties: ['苹果', '大樱桃'],
    unis: [],
    variants: [
      { emoji: '🍎', intro: '烟台苹果咬一口咔嚓脆', introEn: 'Yantai apples are crispy!', words: ['apple'], deco: 'flower' },
      { emoji: '🍒', intro: '大樱桃红得像小灯笼挂满枝头', introEn: 'Big cherries are sweet and red.', words: ['cherry'], deco: 'flower' },
    ],
  },
  {
    id: 'guangzhou', name: '广州', en: 'Guangzhou', color: '#C87A4E', landmark: 'tower',
    specialties: ['早茶', '艇仔粥'],
    unis: [
      { zh: '中山大学', en: 'Sun Yat-sen University', tag: '985' },
      { zh: '华南理工大学', en: 'South China University of Technology', tag: '985' },
      { zh: '暨南大学', en: 'Jinan University', tag: '211' },
    ],
    variants: [
      { emoji: '🏙️', intro: '小蛮腰广州塔会变换七种颜色', introEn: 'Canton Tower changes colors at night.', words: ['tower', 'color'], deco: 'boat' },
      { emoji: '🫖', intro: '早茶"一盅两件"，虾饺烧卖吃不停', introEn: 'Morning tea has many dim sums!', words: ['tea'], deco: 'boat' },
      { emoji: '🐑', intro: '广州又叫羊城，五只仙羊送来稻穗', introEn: 'Guangzhou is the City of Rams.', words: ['sheep'], deco: 'flower' },
    ],
  },
  {
    id: 'shenzhen', name: '深圳', en: 'Shenzhen', color: '#3E8FBF', landmark: 'tower',
    specialties: ['椰子鸡', '广式点心'],
    unis: [
      { zh: '深圳大学', en: 'Shenzhen University', tag: '' },
      { zh: '南方科技大学', en: 'Southern University of Science and Technology', tag: '' },
    ],
    variants: [
      { emoji: '🚀', intro: '四十年从小渔村变成科技之城', introEn: 'Shenzhen grew super fast!', words: ['city', 'fast'], deco: 'boat' },
      { emoji: '🤖', intro: '很多机器人和无人车在这里上班', introEn: 'Robots work in Shenzhen too!', words: ['robot'], deco: 'boat' },
    ],
  },
  {
    id: 'zhuhai', name: '珠海', en: 'Zhuhai', color: '#4EA0B8', landmark: 'harbor',
    specialties: ['膏蟹', '横琴蚝'],
    unis: [],
    variants: [
      { emoji: '💍', intro: '珠海渔女举着明珠站在海里', introEn: 'The Fisher Girl holds a pearl!', words: ['pearl'], deco: 'shell' },
      { emoji: '🏝️', intro: '百岛之城，海岛一个接一个', introEn: 'Zhuhai has a hundred islands.', words: ['island'], deco: 'shell' },
    ],
  },
  {
    id: 'guilin', name: '桂林', en: 'Guilin', color: '#5BA86B', landmark: 'mountain',
    specialties: ['桂林米粉', '罗汉果'],
    unis: [],
    variants: [
      { emoji: '🛶', intro: '桂林山水甲天下，竹筏漂在画里', introEn: 'Guilin scenery is the best under heaven!', words: ['river', 'boat'], deco: 'bamboo' },
      { emoji: '🐘', intro: '象鼻山像一头大象在江边喝水', introEn: 'Elephant Trunk Hill drinks water!', words: ['elephant'], deco: 'bamboo' },
    ],
  },
  {
    id: 'sanya', name: '三亚', en: 'Sanya', color: '#3EA8C8', landmark: 'palm',
    specialties: ['椰子鸡', '海胆'],
    unis: [],
    variants: [
      { emoji: '🏖️', intro: '天涯海角，沙滩软得像棉花糖', introEn: 'Sanya has the softest beaches.', words: ['beach', 'sand'], deco: 'palm' },
      { emoji: '🥥', intro: '椰子水清清甜甜，插根吸管就能喝', introEn: 'Coconut water is fresh and sweet.', words: ['coconut'], deco: 'palm' },
    ],
  },
  {
    id: 'haikou', name: '海口', en: 'Haikou', color: '#4EA89E', landmark: 'palm',
    specialties: ['清补凉', '文昌鸡'],
    unis: [],
    variants: [
      { emoji: '🌇', intro: '骑楼老街的柱子雕满了花', introEn: 'Old arcaded streets look amazing.', words: ['street'], deco: 'palm' },
      { emoji: '🐔', intro: '文昌鸡白切着吃最鲜', introEn: 'Wenchang chicken is famous.', words: ['chicken'], deco: 'palm' },
    ],
  },
  {
    id: 'nanning', name: '南宁', en: 'Nanning', color: '#5EA85E', landmark: 'mountain',
    specialties: ['老友粉', '芒果'],
    unis: [
      { zh: '广西大学', en: 'Guangxi University', tag: '211' },
    ],
    variants: [
      { emoji: '🌳', intro: '绿城南宁，满眼都是绿树', introEn: 'Nanning is called the Green City.', words: ['green'], deco: 'bamboo' },
      { emoji: '🍜', intro: '老友粉酸辣开胃，是南宁人的早餐', introEn: 'Laoyou rice noodles are spicy!', words: ['noodle'], deco: 'bamboo' },
    ],
  },
  {
    id: 'wuhan', name: '武汉', en: 'Wuhan', color: '#B0785A', landmark: 'pavilion',
    specialties: ['热干面', '豆皮'],
    unis: [
      { zh: '武汉大学', en: 'Wuhan University', tag: '985' },
      { zh: '华中科技大学', en: 'Huazhong University of Science and Technology', tag: '985' },
      { zh: '华中师范大学', en: 'Central China Normal University', tag: '211' },
    ],
    variants: [
      { emoji: '🍜', intro: '热干面拌上芝麻酱，香得直冒泡', introEn: 'Hot dry noodles are yummy!', words: ['noodle'], deco: 'flower' },
      { emoji: '🌸', intro: '武大樱花开了像粉色的云', introEn: 'Cherry blossoms bloom at Wuhan University.', words: ['flower'], deco: 'flower' },
      { emoji: '🌉', intro: '长江大桥上火车汽车一起跑', introEn: 'The Yangtze River Bridge is grand!', words: ['bridge'], deco: 'boat' },
    ],
  },
  {
    id: 'changsha', name: '长沙', en: 'Changsha', color: '#C86B4E', landmark: 'mountain',
    specialties: ['臭豆腐', '茶颜悦色'],
    unis: [
      { zh: '湖南大学', en: 'Hunan University', tag: '985' },
      { zh: '中南大学', en: 'Central South University', tag: '985' },
    ],
    variants: [
      { emoji: '🍢', intro: '黑色臭豆腐闻着臭吃着香', introEn: 'Stinky tofu smells bad tastes great!', words: ['tofu'], deco: 'lantern' },
      { emoji: '🎆', intro: '周末橘子洲头会放烟花', introEn: 'Fireworks light up Orange Isle!', words: ['firework'], deco: 'lantern' },
    ],
  },
  {
    id: 'zhengzhou', name: '郑州', en: 'Zhengzhou', color: '#A88A4E', landmark: 'pavilion',
    specialties: ['烩面', '胡辣汤'],
    unis: [
      { zh: '郑州大学', en: 'Zhengzhou University', tag: '211' },
    ],
    variants: [
      { emoji: '🚄', intro: '中国铁路心脏，高铁四通八达', introEn: 'Zhengzhou is a railway hub!', words: ['train'], deco: 'lantern' },
      { emoji: '🍜', intro: '一碗烩面配上胡辣汤才叫满足', introEn: 'Braised noodles are the best!', words: ['noodle'], deco: 'lantern' },
    ],
  },
  {
    id: 'luoyang', name: '洛阳', en: 'Luoyang', color: '#B06B8A', landmark: 'grotto',
    specialties: ['水席', '牡丹饼'],
    unis: [],
    variants: [
      { emoji: '🗿', intro: '龙门石窟的大佛笑了一千多年', introEn: 'Longmen Grottoes are amazing!', words: ['stone', 'buddha'], deco: 'flower' },
      { emoji: '🌹', intro: '洛阳牡丹甲天下，花开动全城', introEn: 'Luoyang peonies are famous!', words: ['flower'], deco: 'flower' },
    ],
  },
  {
    id: 'kaifeng', name: '开封', en: 'Kaifeng', color: '#A8905B', landmark: 'pavilion',
    specialties: ['灌汤包', '花生糕'],
    unis: [],
    variants: [
      { emoji: '🏰', intro: '清明上河图画的汴京就是这里', introEn: 'Kaifeng was the capital long ago.', words: ['capital'], deco: 'lantern' },
      { emoji: '🥟', intro: '灌汤包要提起来像灯笼、放下像菊花', introEn: 'Soup dumplings look like lanterns!', words: ['soup'], deco: 'lantern' },
    ],
  },
  {
    id: 'shijiazhuang', name: '石家庄', en: 'Shijiazhuang', color: '#8A8A5B', landmark: 'wall',
    specialties: ['缸炉烧饼', '金凤扒鸡'],
    unis: [],
    variants: [
      { emoji: '🛤️', intro: '火车拉来的城市，正太铁路百年老站', introEn: 'The city grew with the railway.', words: ['train'], deco: 'lantern' },
      { emoji: '🌉', intro: '赵州桥像一道彩虹卧在洨河上', introEn: 'Zhaozhou Bridge is 1400 years old!', words: ['bridge'], deco: 'lantern' },
    ],
  },
  {
    id: 'taiyuan', name: '太原', en: 'Taiyuan', color: '#8A7A5B', landmark: 'pavilion',
    specialties: ['刀削面', '老陈醋'],
    unis: [
      { zh: '太原理工大学', en: 'Taiyuan University of Technology', tag: '211' },
    ],
    variants: [
      { emoji: '🍜', intro: '刀削面在师傅手里飞成一片', introEn: 'Knife-cut noodles fly like leaves!', words: ['noodle'], deco: 'lantern' },
      { emoji: '🍶', intro: '老陈醋酸香扑鼻，吃面必须来一勺', introEn: 'Aged vinegar smells strong!', words: ['sour'], deco: 'lantern' },
    ],
  },
  {
    id: 'hohhot', name: '呼和浩特', en: 'Hohhot', color: '#6B9EB8', landmark: 'dome',
    specialties: ['烤全羊', '奶茶'],
    unis: [
      { zh: '内蒙古大学', en: 'Inner Mongolia University', tag: '211' },
    ],
    variants: [
      { emoji: '🐴', intro: '草原上的骏马跑起来像风一样', introEn: 'Horses run like wind on grassland!', words: ['horse'], deco: 'horse' },
      { emoji: '🥛', intro: '蒙古奶茶咸香的，配手把肉正好', introEn: 'Milk tea is a grassland treat.', words: ['milk'], deco: 'horse' },
    ],
  },
  {
    id: 'baotou', name: '包头', en: 'Baotou', color: '#7B9E8A', landmark: 'dome',
    specialties: ['手把肉', '奶酪'],
    unis: [],
    variants: [
      { emoji: '🐑', intro: '包头是"有鹿的地方"，草原明珠', introEn: 'Baotou means place with deer.', words: ['deer'], deco: 'horse' },
      { emoji: '🏭', intro: '草原钢城，钢铁从这里运往全国', introEn: 'Baotou is a steel city.', words: ['steel'], deco: 'horse' },
    ],
  },
  {
    id: 'shenyang', name: '沈阳', en: 'Shenyang', color: '#A87A5B', landmark: 'pavilion',
    specialties: ['鸡架', '老边饺子'],
    unis: [
      { zh: '东北大学', en: 'Northeastern University', tag: '985' },
      { zh: '辽宁大学', en: 'Liaoning University', tag: '211' },
    ],
    variants: [
      { emoji: '🏰', intro: '沈阳故宫是清朝最早的皇宫', introEn: 'Shenyang Palace is 400 years old!', words: ['palace'], deco: 'lantern' },
      { emoji: '🍗', intro: '沈阳人撸鸡架配老雪，快乐加倍', introEn: 'Chicken racks are a local treat!', words: ['chicken'], deco: 'lantern' },
    ],
  },
  {
    id: 'dalian', name: '大连', en: 'Dalian', color: '#3E9EB8', landmark: 'harbor',
    specialties: ['海鲜焖子', '海胆'],
    unis: [
      { zh: '大连理工大学', en: 'Dalian University of Technology', tag: '985' },
      { zh: '大连海事大学', en: 'Dalian Maritime University', tag: '211' },
    ],
    variants: [
      { emoji: '🦁', intro: '发现王国的过山车在海边尖叫', introEn: 'Discoveryland is by the sea!', words: ['park'], deco: 'shell' },
      { emoji: '⚽', intro: '足球城大连，人人都会颠两下球', introEn: 'Dalian loves football!', words: ['football'], deco: 'shell' },
    ],
  },
  {
    id: 'changchun', name: '长春', en: 'Changchun', color: '#7B8FA8', landmark: 'pavilion',
    specialties: ['锅包肉', '冷面'],
    unis: [
      { zh: '吉林大学', en: 'Jilin University', tag: '985' },
      { zh: '东北师范大学', en: 'Northeast Normal University', tag: '211' },
    ],
    variants: [
      { emoji: '🚗', intro: '中国第一辆汽车在长春诞生', introEn: 'The first Chinese car was born here!', words: ['car'], deco: 'lantern' },
      { emoji: '🎬', intro: '长影是新中国电影的摇篮', introEn: 'Changchun is a movie city.', words: ['movie'], deco: 'lantern' },
    ],
  },
  {
    id: 'harbin', name: '哈尔滨', en: 'Harbin', color: '#5B8FD9', landmark: 'ice',
    specialties: ['红肠', '马迭尔冰棍'],
    unis: [
      { zh: '哈尔滨工业大学', en: 'Harbin Institute of Technology', tag: '985' },
      { zh: '哈尔滨工程大学', en: 'Harbin Engineering University', tag: '211' },
    ],
    variants: [
      { emoji: '❄️', intro: '冰雪大世界的水晶城堡会发光', introEn: 'Harbin has a magical ice world!', words: ['ice', 'cold'], deco: 'iceflake' },
      { emoji: '🏰', intro: '中央大街的面包石路走了一百年', introEn: 'Central Street looks like Europe.', words: ['street'], deco: 'iceflake' },
      { emoji: '🌭', intro: '零下二十度啃马迭尔冰棍才够爽', introEn: 'Ice cream in winter? Try it!', words: ['sweet'], deco: 'iceflake' },
    ],
  },
  {
    id: 'anshan', name: '鞍山', en: 'Anshan', color: '#8A9EA8', landmark: 'mountain',
    specialties: ['南果梨', '海城馅饼'],
    unis: [],
    variants: [
      { emoji: '⛰️', intro: '千山大佛与奇峰藏进森林里', introEn: 'Qianshan mountain is full of peaks.', words: ['mountain'], deco: 'flower' },
      { emoji: '🍐', intro: '南果梨熟的时候满城都是梨香', introEn: 'Nanguo pears smell sweet!', words: ['pear'], deco: 'flower' },
    ],
  },
  {
    id: 'xian', name: '西安', en: 'Xi\'an', color: '#A86B3E', landmark: 'wall',
    specialties: ['肉夹馍', '羊肉泡馍'],
    unis: [
      { zh: '西安交通大学', en: 'Xi\'an Jiaotong University', tag: '985' },
      { zh: '西北工业大学', en: 'Northwestern Polytechnical University', tag: '985' },
      { zh: '西安电子科技大学', en: 'Xidian University', tag: '211' },
    ],
    variants: [
      { emoji: '🗿', intro: '兵马俑是两千年前的地下军团', introEn: 'The Terracotta Army is 2000 years old!', words: ['army', 'clay'], deco: 'lantern' },
      { emoji: '🧱', intro: '在城墙上骑自行车看古城', introEn: 'Ride a bike on the old city wall!', words: ['wall', 'bike'], deco: 'lantern' },
      { emoji: '🥙', intro: '肉夹馍是被 official 认证的"中式汉堡"', introEn: 'Roujiamo is a Chinese burger!', words: ['burger'], deco: 'lantern' },
    ],
  },
  {
    id: 'lanzhou', name: '兰州', en: 'Lanzhou', color: '#B08A4E', landmark: 'mountain',
    specialties: ['牛肉面', '百合'],
    unis: [
      { zh: '兰州大学', en: 'Lanzhou University', tag: '985' },
    ],
    variants: [
      { emoji: '🍜', intro: '一清二白三红四绿，牛肉面开清晨第一锅', introEn: 'Beef noodles start the day!', words: ['noodle'], deco: 'lantern' },
      { emoji: '🌉', intro: '中山桥是黄河上第一座铁桥', introEn: 'Zhongshan Bridge crosses the Yellow River!', words: ['bridge'], deco: 'lantern' },
    ],
  },
  {
    id: 'dunhuang', name: '敦煌', en: 'Dunhuang', color: '#C8A85B', landmark: 'grotto',
    specialties: ['杏皮水', '驴肉黄面'],
    unis: [],
    variants: [
      { emoji: '🎨', intro: '莫高窟壁画上的飞天会跳舞', introEn: 'Mogao caves are full of murals!', words: ['art'], deco: 'lantern' },
      { emoji: '🐪', intro: '鸣沙山的驼队慢慢走向月牙泉', introEn: 'Camels walk to the Crescent Lake.', words: ['camel'], deco: 'lantern' },
    ],
  },
  {
    id: 'urumqi', name: '乌鲁木齐', en: 'Urumqi', color: '#5B8AB8', landmark: 'dome',
    specialties: ['大盘鸡', '哈密瓜'],
    unis: [],
    variants: [
      { emoji: '🍈', intro: '哈密瓜甜到心里，葡萄干当零食', introEn: 'Melons here are super sweet!', words: ['melon'], deco: 'grape' },
      { emoji: '🏔️', intro: '天山雪峰就站在城市背后', introEn: 'Tianshan mountains stand behind the city.', words: ['snow'], deco: 'grape' },
    ],
  },
  {
    id: 'yinchuan', name: '银川', en: 'Yinchuan', color: '#A8A05B', landmark: 'dome',
    specialties: ['手抓羊肉', '枸杞'],
    unis: [],
    variants: [
      { emoji: '🏜️', intro: '沙湖一半是沙一半是水', introEn: 'Sand Lake has sand and water!', words: ['sand'], deco: 'lantern' },
      { emoji: '🍇', intro: '贺兰山下酿出了好葡萄酒', introEn: 'Grapes grow by Helan mountain.', words: ['grape'], deco: 'grape' },
    ],
  },
  {
    id: 'xining', name: '西宁', en: 'Xining', color: '#5B9EA8', landmark: 'mountain',
    specialties: ['酸奶', '手抓羊肉'],
    unis: [],
    variants: [
      { emoji: '🏞️', intro: '青海湖蓝得像掉在地上的天空', introEn: 'Qinghai Lake is super blue!', words: ['lake'], deco: 'flower' },
      { emoji: '🥛', intro: '老酸奶结着厚厚的奶皮', introEn: 'Yogurt here has thick cream!', words: ['yogurt'], deco: 'flower' },
    ],
  },
  {
    id: 'lasa', name: '拉萨', en: 'Lhasa', color: '#B85A4E', landmark: 'mountain',
    specialties: ['酥油茶', '青稞酒'],
    unis: [],
    variants: [
      { emoji: '🏔️', intro: '布达拉宫在阳光下红白分明', introEn: 'Potala Palace shines in the sun.', words: ['palace'], deco: 'flower' },
      { emoji: '☁️', intro: '这里的云低得好像伸手就能摸到', introEn: 'Clouds feel so close here!', words: ['sky'], deco: 'flower' },
    ],
  },
  {
    id: 'kunming', name: '昆明', en: 'Kunming', color: '#5BA85B', landmark: 'mountain',
    specialties: ['过桥米线', '鲜花饼'],
    unis: [
      { zh: '云南大学', en: 'Yunnan University', tag: '211' },
    ],
    variants: [
      { emoji: '🌸', intro: '春城四季如春，鲜花按斤称', introEn: 'Kunming is the Spring City!', words: ['spring'], deco: 'flower' },
      { emoji: '🕊️', intro: '冬天红嘴鸥从西伯利亚飞来过冬', introEn: 'Seagulls visit every winter!', words: ['bird'], deco: 'flower' },
    ],
  },
  {
    id: 'lijiang', name: '丽江', en: 'Lijiang', color: '#8A9E5B', landmark: 'pavilion',
    specialties: ['腊排骨', '鲜花饼'],
    unis: [],
    variants: [
      { emoji: '🏘️', intro: '古城的小桥流水绕着每一家店', introEn: 'Old town has little bridges!', words: ['bridge'], deco: 'tea' },
      { emoji: '🏔️', intro: '玉龙雪山的雪顶一年不化', introEn: 'Jade Dragon Snow Mountain is white all year.', words: ['snow'], deco: 'tea' },
    ],
  },
  {
    id: 'dali', name: '大理', en: 'Dali', color: '#6B9EA8', landmark: 'mountain',
    specialties: ['乳扇', '雕梅'],
    unis: [],
    variants: [
      { emoji: '🏔️', intro: '苍山不墨千秋画，洱海无弦万古琴', introEn: 'Cangshan and Erhai are a painting.', words: ['lake'], deco: 'tea' },
      { emoji: '🏠', intro: '白族小院青瓦白墙上画着水墨花', introEn: 'Bai houses are white and blue.', words: ['house'], deco: 'tea' },
    ],
  },
  {
    id: 'guiyang', name: '贵阳', en: 'Guiyang', color: '#5E9E8A', landmark: 'mountain',
    specialties: ['酸汤鱼', '丝娃娃'],
    unis: [],
    variants: [
      { emoji: '🌊', intro: '黄果树瀑布的水声十里外都听得见', introEn: 'Huangguoshu Waterfall roars!', words: ['water'], deco: 'bamboo' },
      { emoji: '🍲', intro: '酸汤鱼酸得开胃，红酸汤是木瓜发酵的', introEn: 'Sour soup fish is tasty!', words: ['fish'], deco: 'bamboo' },
    ],
  },
  {
    id: 'zunyi', name: '遵义', en: 'Zunyi', color: '#A85B4E', landmark: 'mountain',
    specialties: ['羊肉粉', '鸡蛋糕'],
    unis: [],
    variants: [
      { emoji: '🚩', intro: '遵义会议在这里写进了历史书', introEn: 'Zunyi is a historic red city.', words: ['history'], deco: 'bamboo' },
      { emoji: '🌶️', intro: '虾子辣椒又香又辣，全国闻名', introEn: 'Zunyi chilies are famous!', words: ['spicy'], deco: 'chili' },
    ],
  },
];

// 舞台装饰类型 → emoji（cities variants 的 deco 字段）
export const DECO_EMOJI = {
  lantern: '🏮', chili: '🌶️', boat: '⛵', tea: '🍵', flower: '🌸', shell: '🐚',
  palm: '🌴', bamboo: '🎍', horse: '🐴', grape: '🍇', iceflake: '❄️',
};

// ---------- 工具函数 ----------
export const CITY_MAP = Object.fromEntries(CITIES.map(c => [c.id, c]));

function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// 城市巡游路线：家乡 → 洗牌（家乡/北京除外）→ 北京收尾
// seed = 昵称+册：同一孩子同一册每次进游戏路线一致（进度可续）
export function cityRoute(homeId, semKey, count, username = '') {
  const home = CITY_MAP[homeId] ? homeId : 'beijing';
  const pool = CITIES.map(c => c.id).filter(id => id !== home && id !== 'beijing');
  let seed = hash(username + '|' + semKey);
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const mid = pool.slice(0, Math.max(0, count - 2));
  return [home, ...mid, 'beijing'].slice(0, Math.max(1, count));
}

// 第 visit 次到访（0 起）该用哪个介绍版本：常来常新
export function cityVariant(city, visit) {
  const vs = city && city.variants && city.variants.length ? city.variants : [{ emoji: '🏙️', intro: city ? city.name : '', introEn: city ? city.en : '', words: [], deco: 'lantern' }];
  return vs[Math.max(0, visit) % vs.length];
}
