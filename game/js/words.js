// 词宠岛 · 阳光农场词库（人教版 PEP 3-6 年级核心词）
// 每个词条：en 单词 / zh 中文 / syl 音节 / hint 谜面 / story 图鉴小故事 / pet 模型 / pos 蛋的位置 / zone 区域

export const WORDS = [
  // ============ 出生草甸（初始可探索） ============
  { id: 'cat',     en: 'cat',     zh: '小猫',   syl: ['cat'],            hint: '喵喵叫，最爱晒太阳',            pet: 'cat',     pos: [-5, 24],   zone: 'meadow',
    story: '它总在谷仓顶上打盹，呼噜声像一台小小的拖拉机。' },
  { id: 'dog',     en: 'dog',     zh: '小狗',   syl: ['dog'],            hint: '人类最好的朋友，会握手',        pet: 'dog',     pos: [5, 26],    zone: 'meadow',
    story: '每天早上绕着农场跑三圈，尾巴摇得像一架小风车。' },
  { id: 'duck',    en: 'duck',    zh: '鸭子',   syl: ['duck'],           hint: '走路摇摇摆摆，嘎嘎叫',          pet: 'duck',    pos: [-11, 17],  zone: 'meadow',
    story: '走路摇摇摆摆，一下河却是人人佩服的游泳冠军。' },
  { id: 'rabbit',  en: 'rabbit',  zh: '兔子',   syl: ['rab', 'bit'],     hint: '长耳朵，爱吃萝卜',              pet: 'rabbit',  pos: [9, 14],    zone: 'meadow',
    story: '它的长耳朵特别灵，能听到三块田外萝卜发芽的声音。' },
  { id: 'mouse',   en: 'mouse',   zh: '老鼠',   syl: ['mouse'],          hint: '小小只，最爱奶酪',              pet: 'mouse',   pos: [-3, 11],   zone: 'meadow',
    story: '口袋里永远装着一小块饼干屑，说是留给远方的朋友。' },
  { id: 'frog',    en: 'frog',    zh: '青蛙',   syl: ['frog'],           hint: '绿色的跳跃健将，呱呱',          pet: 'frog',    pos: [13, 21],   zone: 'meadow',
    story: '每场雨停之后，它都会在荷叶上开一场个人演唱会。' },
  { id: 'flower',  en: 'flower',  zh: '花',     syl: ['flow', 'er'],     hint: '花园里香香的颜色',              pet: 'flower',  pos: [-13, 25],  zone: 'meadow',
    story: '会对着太阳点头问好，还把香味借给路过的蜜蜂。' },
  { id: 'grass',   en: 'grass',   zh: '草',     syl: ['grass'],          hint: '软软的绿地毯',                  pet: 'grass',   pos: [-8, 31],   zone: 'meadow',
    story: '一大片软软的绿地毯，光脚踩上去它会咯咯地笑。' },
  { id: 'boat',    en: 'boat',    zh: '小船',   syl: ['boat'],           hint: '水上代步的小交通工具',          pet: 'boat',    pos: [-2.5, 6.5], zone: 'meadow',
    story: '涨水的日子它最勇敢，驮着所有朋友稳稳地过河。' },
  { id: 'light',   en: 'light',   zh: '灯',     syl: ['light'],          hint: '黑暗里最需要它',                pet: 'light',   pos: [9, 31],    zone: 'meadow',
    story: '一盏不肯睡觉的小灯笼，专门照亮怕黑的小伙伴。' },
  { id: 'seed',    en: 'seed',    zh: '种子',   syl: ['seed'],           hint: '种进土里就会发芽',              pet: 'seed',    pos: [-14, 16],  zone: 'meadow',
    story: '睡在泥土里做一个长长的梦，梦里自己长成了大树。' },

  // ============ 果园（过河后） ============
  { id: 'apple',   en: 'apple',   zh: '苹果',   syl: ['ap', 'ple'],      hint: '红色的水果，保持健康靠它',      pet: 'apple',   pos: [-18, -13], zone: 'orchard',
    story: '它的红脸蛋不是害羞，是因为天天被夸甜。' },
  { id: 'banana',  en: 'banana',  zh: '香蕉',   syl: ['ba', 'na', 'na'], hint: '黄色的，猴子最爱',              pet: 'banana',  pos: [-27, -10], zone: 'orchard',
    story: '弯弯的身体，是它特意为小猴子准备的小月牙。' },
  { id: 'carrot',  en: 'carrot',  zh: '胡萝卜', syl: ['car', 'rot'],     hint: '橙色，兔子的最爱',              pet: 'carrot',  pos: [-13, -21], zone: 'orchard',
    story: '越是把身体藏进土里，越是盼着被小兔子发现。' },
  { id: 'tomato',  en: 'tomato',  zh: '西红柿', syl: ['to', 'ma', 'to'], hint: '红色蔬果，做菜生吃都行',        pet: 'tomato',  pos: [-23, -19], zone: 'orchard',
    story: '酸酸甜甜脾气最好，从来不红脸吵架——它本来就红。' },
  { id: 'potato',  en: 'potato',  zh: '土豆',   syl: ['po', 'ta', 'to'], hint: '土里的圆宝宝，薯条的前身',      pet: 'potato',  pos: [-9, -11],  zone: 'orchard',
    story: '圆滚滚的地里小球，全农场捉迷藏年年第一名。' },
  { id: 'corn',    en: 'corn',    zh: '玉米',   syl: ['corn'],           hint: '金黄的颗粒排排队',              pet: 'corn',    pos: [-29, -23], zone: 'orchard',
    story: '穿着绿色小外套，头顶留着一撮金黄色的流苏。' },
  { id: 'goat',    en: 'goat',    zh: '山羊',   syl: ['goat'],           hint: '下巴有胡子的爬山高手',          pet: 'goat',    pos: [-19, -7],  zone: 'orchard',
    story: '山羊爷爷的胡子白白的，最爱站在小山坡顶上看云。' },

  // ============ 风车田（大风球挡路，需 wind） ============
  { id: 'wind',    en: 'wind',    zh: '风',     syl: ['wind'],           hint: '摸不到，但能吹动风车',          pet: 'wind',    pos: [11, -6],   zone: 'windmill',
    story: '一位看不见的朋友，路过时会顺手替你接住帽子。' },
  { id: 'pig',     en: 'pig',     zh: '小猪',   syl: ['pig'],            hint: '粉色，爱在泥坑里打滚',          pet: 'pig',     pos: [21, -15],  zone: 'windmill',
    story: '在泥坑里痛痛快快打完滚，再自豪地抖一抖全身。' },
  { id: 'cow',     en: 'cow',     zh: '奶牛',   syl: ['cow'],            hint: '给我们牛奶的大家伙',            pet: 'cow',     pos: [28, -22],  zone: 'windmill',
    story: '慢性子嚼着草看云，一眼就能认出云朵的形状。' },
  { id: 'bird',    en: 'bird',    zh: '小鸟',   syl: ['bird'],           hint: '天上飞的小可爱',                pet: 'bird',    pos: [17, -25],  zone: 'windmill',
    story: '农场的晨间广播员，每天负责叫醒第一缕阳光。' },
  { id: 'bee',     en: 'bee',     zh: '蜜蜂',   syl: ['bee'],            hint: '嗡嗡嗡，酿蜜的小工人',          pet: 'bee',     pos: [25, -11],  zone: 'windmill',
    story: '提着小小花蜜桶，嗡嗡嗡地在花丛里送外卖。' },

  // ============ 谷仓外 ============
  { id: 'horse',   en: 'horse',   zh: '马',     syl: ['horse'],          hint: '嗒嗒嗒奔跑的大动物',            pet: 'horse',   pos: [31, 15],   zone: 'barnyard',
    story: '鬃毛像流动的火焰，跑起来蹄声嗒嗒嗒像打鼓。' },
  { id: 'sheep',   en: 'sheep',   zh: '绵羊',   syl: ['sheep'],          hint: '白白卷卷，像一朵云',            pet: 'sheep',   pos: [17, 27],   zone: 'barnyard',
    story: '一朵会走路的云，剪了毛也不生气，还夸新发型凉快。' },

  // ============ 谷仓内（黑黑的，需 light） ============
  { id: 'hen',     en: 'hen',     zh: '母鸡',   syl: ['hen'],            hint: '咯咯哒，会下蛋',                pet: 'hen',     pos: [22.5, 20.8], zone: 'barn',
    story: '每天下一个蛋，然后骄傲地咯咯哒宣传一整天。' },
  { id: 'milk',    en: 'milk',    zh: '牛奶',   syl: ['milk'],           hint: '白色的饮品，喝了长高高',        pet: 'milk',    pos: [25.5, 20.5], zone: 'barn',
    story: '装在纸盒里的小白云，喝一口就浑身是力气。' },
  { id: 'bread',   en: 'bread',   zh: '面包',   syl: ['bread'],          hint: '烤得香喷喷的主食',              pet: 'bread',   pos: [26, 23.5],   zone: 'barn',
    story: '刚出炉时最神气，香味能飘过农场的三条小街。' },
  { id: 'egg',     en: 'egg',     zh: '鸡蛋',   syl: ['egg'],            hint: '椭圆的，鸡妈妈的礼物',          pet: 'egg',     pos: [22.5, 23.5], zone: 'barn',
    story: '一枚椭圆的小太阳，敲开就是早餐时间的惊喜。' },
  { id: 'cake',    en: 'cake',    zh: '蛋糕',   syl: ['cake'],           hint: '生日那天必备的甜品',            pet: 'cake',    pos: [24, 22.5],   zone: 'barn',
    story: '生日当天它最闪亮，蜡烛是它的小王冠。' },
  { id: 'tractor', en: 'tractor', zh: '拖拉机', syl: ['trac', 'tor'],    hint: '农场里轰隆隆的大车',            pet: 'tractor', pos: [21.8, 22],   zone: 'barn',
    story: '农场的钢铁大牛，轰隆隆地翻出春天松软的泥土。' },

  // ============ 菜园（种豆得藤） ============
  { id: 'rain',    en: 'rain',    zh: '雨',     syl: ['rain'],           hint: '从云朵里落下的水',              pet: 'rain',    pos: [-26, 27],  zone: 'garden',
    story: '是云朵在打喷嚏，花草们一个个张着嘴接住。' },
  { id: 'tree',    en: 'tree',    zh: '大树',   syl: ['tree'],           hint: '高高的绿色大伞',                pet: 'tree',    pos: [-30, 20],  zone: 'garden',
    story: '举着一把绿色大伞，为野餐的大家挡住晒人的太阳。' },
  { id: 'sun',     en: 'sun',     zh: '太阳',   syl: ['sun'],            hint: '天上的金色球球',                pet: 'sun',     pos: [-19, 31],  zone: 'garden',
    story: '每天准时上班的金色球球，下班时会换成橘色。' },

  // ============ 天空岛（豆藤顶端） ============
  { id: 'star',    en: 'star',    zh: '星星',   syl: ['star'],           hint: '夜晚一闪一闪的',                pet: 'star',    pos: [-20.5, 24.5], zone: 'sky',
    story: '夜空里的萤火虫，一眨一眨，是在跟大家说晚安。' },
  { id: 'moon',    en: 'moon',    zh: '月亮',   syl: ['moon'],           hint: '弯弯的银色小船',                pet: 'moon',    pos: [-23.5, 25.5], zone: 'sky',
    story: '弯弯的银色小船，每天夜里载着全世界的梦。' },

  // ============ 阳光海滩（吹开沙墙后） ============
  { id: 'ship',    en: 'ship',    zh: '轮船',   syl: ['ship'],           hint: '海上轰隆隆的大船',              pet: 'ship',    pos: [-4, 39],   zone: 'beach',
    story: '海上的大个子，汽笛一响，海鸥都跟着它去旅行。' },
  { id: 'fish',    en: 'fish',    zh: '鱼',     syl: ['fish'],           hint: '在水里游来游去',                pet: 'fish',    pos: [8, 40],    zone: 'beach',
    story: '眨眼的功夫就能从礁石游到沙滩，游泳比赛从不输。' },
  { id: 'ball',    en: 'ball',    zh: '皮球',   syl: ['ball'],           hint: '圆圆的，能拍能踢',              pet: 'ball',    pos: [16, 40],   zone: 'beach',
    story: '圆滚滚的捣蛋鬼，一拍就蹦得老高，谁都追不上。' },
  { id: 'kite',    en: 'kite',    zh: '风筝',   syl: ['kite'],           hint: '牵着线飞上天的',                pet: 'kite',    pos: [-20, 38],  zone: 'beach',
    story: '最喜欢大风天，飞得比楼还高，尾巴上的蝴蝶结哗啦啦。' },
  { id: 'whale',   en: 'whale',   zh: '鲸鱼',   syl: ['whale'],          hint: '海里最大的动物',                pet: 'whale',   pos: [-12, 42],  zone: 'beach',
    story: '大海里最大的歌手，喷出的水柱比房子还高。' },
  { id: 'crab',    en: 'crab',    zh: '螃蟹',   syl: ['crab'],           hint: '横着走路，举着大钳子',          pet: 'crab',    pos: [14, 43],   zone: 'beach',
    story: '沙滩上的横行小将军，挥着两把大钳子天天操练。' },
  { id: 'sea',     en: 'sea',     zh: '大海',   syl: ['sea'],            hint: '很大很大的蓝色水域',            pet: 'sea',     pos: [18, 44],   zone: 'beach',
    story: '蓝蓝的大摇篮，摇晃着所有的船和小鱼睡觉。' },
  { id: 'shell',   en: 'shell',   zh: '贝壳',   syl: ['shell'],          hint: '海滩上能捡到的',                pet: 'shell',   pos: [-18, 42],  zone: 'beach',
    story: '大海的小喇叭，贴在耳朵上能听见海浪的歌。' },
  { id: 'sand',    en: 'sand',    zh: '沙子',   syl: ['sand'],           hint: '金灿灿软绵绵，堆城堡全靠它',    pet: 'sand',    pos: [10, 46],   zone: 'beach',
    story: '数不清的金色小颗粒，是堆沙堡最好的砖头。' },
  { id: 'wave',    en: 'wave',    zh: '浪花',   syl: ['wave'],           hint: '卷着白边冲上岸',                pet: 'wave',    pos: [-8, 47],   zone: 'beach',
    story: '大海伸出的白花边小手，挠得脚丫子咯咯笑。' },
  { id: 'starfish', en: 'starfish', zh: '海星', syl: ['star', 'fish'],   hint: '像星星一样趴在沙滩上',          pet: 'starfish', pos: [4, 47],   zone: 'beach',
    story: '海里的五角星，走路慢吞吞，趴着睡大觉。' },
  { id: 'icecream', en: 'ice cream', zh: '冰淇淋', syl: ['ice', 'cream'], hint: '甜甜的、凉凉的夏天甜点',        pet: 'icecream', pos: [-16, 45], zone: 'beach',
    story: '太阳越晒它越开心，因为小朋友们都排着队等它。' },

  // ============ 神秘森林（拨开荆棘后） ============
  { id: 'owl',     en: 'owl',     zh: '猫头鹰', syl: ['owl'],            hint: '夜里值班，咕咕叫',              pet: 'owl',     pos: [-42, -10], zone: 'forest',
    story: '森林的夜间守卫，睁着大眼睛替大家看星星。' },
  { id: 'leaf',    en: 'leaf',    zh: '树叶',   syl: ['leaf'],           hint: '秋天会变黄飘落',                pet: 'leaf',    pos: [-44, -16], zone: 'forest',
    story: '大树寄给地面的明信片，落下来时会转着圈跳舞。' },
  { id: 'stone',   en: 'stone',   zh: '石头',   syl: ['stone'],          hint: '硬硬的，河边的灰色小块',        pet: 'stone',   pos: [-40, -4],  zone: 'forest',
    story: '最有耐心的大力士，蹲在溪边数了一百年小鱼。' },
  { id: 'wood',    en: 'wood',    zh: '木头',   syl: ['wood'],           hint: '砍下来的树干',                  pet: 'wood',    pos: [-46, -6],  zone: 'forest',
    story: '躺着也干活的小木头，啄木鸟把它当成敲门的家。' },
  { id: 'fox',     en: 'fox',     zh: '狐狸',   syl: ['fox'],            hint: '尖耳朵大尾巴，很聪明',          pet: 'fox',     pos: [-48, 2],   zone: 'forest',
    story: '森林里的小机灵鬼，蓬蓬大尾巴一扫就是一个枕头。' },
  { id: 'bear',    en: 'bear',    zh: '熊',     syl: ['bear'],           hint: '爱吃蜂蜜的壮家伙',              pet: 'bear',    pos: [-44, 8],   zone: 'forest',
    story: '抱着蜂蜜罐打呼噜的大家伙，冬天要睡长长一觉。' },
  { id: 'panda',   en: 'panda',   zh: '熊猫',   syl: ['pan', 'da'],      hint: '黑白相间，爱吃竹子',            pet: 'panda',   pos: [-48, 10],  zone: 'forest',
    story: '戴着黑墨镜的竹子大胃王，吃完就靠着树打滚。' },
  { id: 'monkey',  en: 'monkey',  zh: '猴子',   syl: ['mon', 'key'],     hint: '爬树高手，爱吃香蕉',            pet: 'monkey',  pos: [-46, 16],  zone: 'forest',
    story: '树梢上的杂技演员，尾巴一卷就能倒挂看世界。' },
  { id: 'deer',    en: 'deer',    zh: '鹿',     syl: ['deer'],           hint: '头上长着树枝一样的角',          pet: 'deer',    pos: [-40, 14],  zone: 'forest',
    story: '森林里的小绅士，头顶的角像一顶开花的王冠。' },
  { id: 'squirrel', en: 'squirrel', zh: '松鼠', syl: ['squir', 'rel'],   hint: '大尾巴，爱囤松果',              pet: 'squirrel', pos: [-40, 20], zone: 'forest',
    story: '毛茸茸的小管家，把松果藏得到处都是，再慢慢找。' },
  { id: 'nest',    en: 'nest',    zh: '鸟窝',   syl: ['nest'],           hint: '小鸟的家，树枝搭成',            pet: 'nest',    pos: [-46, 20],  zone: 'forest',
    story: '树上圆圆的小摇篮，风一吹，小鸟们就睡着了。' },
  { id: 'mushroom', en: 'mushroom', zh: '蘑菇', syl: ['mush', 'room'],   hint: '雨后伞一样冒出来',              pet: 'mushroom', pos: [-48, -12], zone: 'forest',
    story: '森林里的小雨伞，下雨天蚂蚁们排队来躲雨。' },
];

export const WORD_MAP = Object.fromEntries(WORDS.map(w => [w.id, w]));
export const TOTAL = WORDS.length;

// 区域中文名
export const ZONE_NAMES = {
  meadow: '出生草甸', orchard: '阳光果园', windmill: '风车田',
  barnyard: '谷仓前院', barn: '谷仓里', garden: '魔法菜园', sky: '天空岛',
  beach: '阳光海滩', forest: '神秘森林',
};

// 关卡制：每关 6 个词，通关后新一批蛋才会出现（避免一上来 60 颗蛋太散太累）
// 钥匙词固定钉在对应关卡：boat→第1关过河，light→第2关照亮谷仓，wind→第3关吹走干草球，
// seed/rain→第4关种豆藤，star/moon→第6关天空岛金色传说；
// 第7-10关：吹开沙墙进海滩（用已孵化的 wind）、拨开荆棘进森林（用已孵化的 banana）
export const CHAPTERS = [
  { name: '出生草甸', words: ['cat', 'dog', 'duck', 'rabbit', 'mouse', 'boat'] },
  { name: '阳光果园', words: ['flower', 'grass', 'frog', 'apple', 'banana', 'light'] },
  { name: '果园丰收', words: ['carrot', 'tomato', 'potato', 'corn', 'goat', 'wind'] },
  { name: '风车田与菜园', words: ['pig', 'cow', 'bird', 'bee', 'seed', 'rain'] },
  { name: '谷仓与牧场', words: ['horse', 'sheep', 'hen', 'milk', 'bread', 'egg'] },
  { name: '天空岛传说', words: ['cake', 'tractor', 'tree', 'sun', 'star', 'moon'] },
  { name: '海边来客', words: ['ship', 'fish', 'ball', 'kite', 'whale', 'crab'] },
  { name: '沙滩游戏', words: ['sea', 'shell', 'sand', 'wave', 'starfish', 'icecream'] },
  { name: '森林朋友', words: ['owl', 'leaf', 'stone', 'wood', 'fox', 'bear'] },
  { name: '森林秘密', words: ['panda', 'monkey', 'deer', 'squirrel', 'nest', 'mushroom'] },
];
export const PER_CHAPTER = 6;
export const chapterIndex = hatchedCount => Math.min(Math.floor(hatchedCount / PER_CHAPTER), CHAPTERS.length - 1);
export const chapterWordIds = idx => CHAPTERS[idx].words;

// 喂养复习的遗忘曲线（毫秒）
export const FEED_INTERVALS = [10 * 60e3, 1 * 864e5, 3 * 864e5, 7 * 864e5, 14 * 864e5];
