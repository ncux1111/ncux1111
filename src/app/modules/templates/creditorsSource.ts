export interface RawCreditorSourceEntry {
  name: string;
  category: 'bank' | 'mfo' | 'collector' | 'other';
  address?: string | null;
  bin?: string | null;
  phone?: string | null;
  emails?: string[];
}

export const RAW_CREDITOR_SOURCE: RawCreditorSourceEntry[] = [
  {
    "name": "АО «Банк ЦентрКредит»",
    "category": "bank",
    "address": "г.Алматы, пр. Аль-Фараби, д.38",
    "bin": "980640000093",
    "phone": "+7(701)223-02-28",
    "emails": [
      "info@bcc.kz"
    ]
  },
  {
    "name": "АО «Kaspi Bank»",
    "category": "bank",
    "address": "г.Алматы, ул.Наурызбай батыра 154А",
    "bin": "971240001315",
    "phone": "+7 727 258 5965",
    "emails": [
      "office@kaspi.kz"
    ]
  },
  {
    "name": "АО «Евразийский Банк»",
    "category": "bank",
    "address": "г.Алматы, ул. Кунаева, дом 56",
    "bin": "950240000112",
    "phone": "+7 (727) 244-39-24",
    "emails": [
      "info@eubank.kz"
    ]
  },
  {
    "name": "АО «Фридом Банк Казахстан»",
    "category": "bank",
    "address": "г.Алматы, ул. Курмангазы, 61А",
    "bin": "090740019001",
    "phone": "7(7272) 59 55 95",
    "emails": [
      "salem@freedombank.kz",
      "info@ffin.credit"
    ]
  },
  {
    "name": "AO «Bank RBK»",
    "category": "bank",
    "address": "г. Алматы, площадь Республики, 15",
    "bin": "090740019001",
    "phone": "+7 (727) 330 90 30",
    "emails": [
      "info@bankrbk.kz"
    ]
  },
  {
    "name": "АО «Home Credit Bank»",
    "category": "bank",
    "address": "г. Алматы, пр. Нурсултан Назарбаев, 248",
    "bin": "930540000147",
    "phone": "+7 (727) 244 55 06",
    "emails": [
      "client@homecredit.kz"
    ]
  },
  {
    "name": "АО «First Heartland Jusan Bank»",
    "category": "bank",
    "address": "г. Алматы, пр. Назарбаева, дом 242",
    "bin": "920140000084",
    "phone": "+7(7172) 58 77 11",
    "emails": [
      "info@jusan.kz"
    ]
  },
  {
    "name": "АО Bereke Bank JSC (SB of Lesha Bank LLC (Public))",
    "category": "bank",
    "address": "г. Алматы, пр. Аль-Фараби, 13",
    "bin": "930740000137",
    "phone": "+7 (727) 321-21-11",
    "emails": [
      "post@berekebank.kz"
    ]
  },
  {
    "name": "АО «Forte Bank»",
    "category": "bank",
    "address": "г. Астана, ул. Достык, 8/1",
    "bin": "990740000683",
    "phone": "+7 (7172) 58 40 40",
    "emails": [
      "info@fortebank.com"
    ]
  },
  {
    "name": "АО «Народный Банк Казахстана»",
    "category": "bank",
    "address": "г. Алматы, пр. Аль-Фараби, 40",
    "bin": "940140000385",
    "phone": "+7 (727) 259 07 77",
    "emails": [
      "info@halykbank.kz"
    ]
  },
  {
    "name": "ДО АО Банк ВТБ (Казахстан)",
    "category": "bank",
    "address": "г.Алматы, Тимирязева, д.3, 26/29",
    "bin": "080940010300",
    "phone": null,
    "emails": [
      "info@vtb-bank.kz"
    ]
  },
  {
    "name": "ТОО «МФО «Робокэш.кз»",
    "category": "mfo",
    "address": "г. Алматы, ул. Монгольская, дом 44",
    "bin": "200940013491",
    "phone": "+7 (775) 0300-24-7",
    "emails": [
      "info.robocash@zaimer.kz"
    ]
  },
  {
    "name": "ТОО «МФО «BeeClever»",
    "category": "mfo",
    "address": "Aлматы, ул. Грановского, д.30/2",
    "bin": "240240002001",
    "phone": "+7 (700) 000-50-80",
    "emails": [
      "info@beecredit.kz"
    ]
  },
  {
    "name": "ТОО «МФО «AUTO SIYLIQFINANCE»",
    "category": "mfo",
    "address": "г. Aлмaты, ул. Кaбдoлoвa, дoм № 16",
    "bin": "220240035629",
    "phone": "+7 (700) 888-55-88",
    "emails": [
      "info@acredit.kz"
    ]
  },
  {
    "name": "ТОО «МФО «ONE CREDIT»",
    "category": "mfo",
    "address": "г. Aлмaты, ул. Бoгeнбaй бaтыpa, д. 142, кaб. 502",
    "bin": "220940025716",
    "phone": "8 (700) 888-58-58",
    "emails": [
      "info@onecredit.kz"
    ]
  },
  {
    "name": "ТОО «МФО «ФинтехФинанс»",
    "category": "mfo",
    "address": "г. Aлмaты, пp. Ceйфуллинa 502, БЦ «TURAR»",
    "bin": "200840014753",
    "phone": "+7 (701) 006-35-00",
    "emails": [
      "dolg@moneyman.kz"
    ]
  },
  {
    "name": "ТОО «МФО «Credit365 Kazakhstan» (Кредит 365Казахстан)",
    "category": "mfo",
    "address": "г.Aлмaты, ул. Бoгeнбaй бaтыpa, 142, здaниe БЦ «Kaisar Tower»",
    "bin": "200940032913",
    "phone": "+7 (708) 365-00-00",
    "emails": [
      "info@credit365.kz"
    ]
  },
  {
    "name": "ТОО «МФО «CreditBar (КредитБар)»",
    "category": "mfo",
    "address": "г. Acтaнa, ул. Конаева,12/1, Bcтpoeннoe пoмeщeниe 27",
    "bin": "220940011323",
    "phone": "+7 (771) 933-33-33",
    "emails": [
      "info@creditbar.kz"
    ]
  },
  {
    "name": "ТОО «МФО «Touchzaim»",
    "category": "mfo",
    "address": "г.Уральск, Микрорайон Строитель, дом 30",
    "bin": "200640001754",
    "phone": "+7 778 003 04 14",
    "emails": [
      "appeal@touchzaim.kz"
    ]
  },
  {
    "name": "TOO «MФO «OнлaйнКaзФинaнc»",
    "category": "other",
    "address": "г. Алматы, Проспект Сейфуллина, дом 502",
    "bin": "1608400003971",
    "phone": "+7 (701) 006-35-35",
    "emails": [
      "support@solva.kz"
    ]
  },
  {
    "name": "ТОО «МФО «Hava Finance»",
    "category": "mfo",
    "address": "г. Алматы, пpocпeкт Ceйфуллинa, дoм №502 E-mail: info@hava.kz",
    "bin": "211140015760",
    "phone": null,
    "emails": [
      "info@hava.kz"
    ]
  },
  {
    "name": "ТОО «МФО «Qanat finance»",
    "category": "mfo",
    "address": "г. Алматы, Жетысуский район, улица Бродского, дом37Б",
    "bin": "210540018826",
    "phone": null,
    "emails": [
      "help@qanat.kz"
    ]
  },
  {
    "name": "ТОО «МФО «Lending and Finance",
    "category": "mfo",
    "address": "г. Петропавловск, ул. Нұрсұлтан Назарбаев, дом 134",
    "bin": "150840012933",
    "phone": null,
    "emails": [
      "info@dengiclick.kz"
    ]
  },
  {
    "name": "ТОО «МФО «аФинанс»",
    "category": "mfo",
    "address": "г.Алматы, ул.Толе би, 265",
    "bin": "200240014008",
    "phone": null,
    "emails": [
      "help@turbomoney.kz"
    ]
  },
  {
    "name": "ТОО «МФО «Деньги говорят»",
    "category": "mfo",
    "address": "г.Алматы, Наурызбайский р-н, мкр. Рахат, ул. Култобе, 4",
    "bin": "190540004760",
    "phone": null,
    "emails": [
      "help@tengeda.kz"
    ]
  },
  {
    "name": "ТОО «МФО «PROCREDIT»",
    "category": "mfo",
    "address": "г. Алматы, Проспект Жибек жолы, дом 64/47",
    "bin": "220940037204",
    "phone": null,
    "emails": [
      "info-procredit@prozaimy.kz"
    ]
  },
  {
    "name": "TOO «MФO «Kredit Seven Kazakhstan (Кpeдит Ceвeн Кaзaxcтaн)»",
    "category": "other",
    "address": "г. Aлмaты, Mикpopaйoн Caмaл-1, дoм 28",
    "bin": "200340016315",
    "phone": null,
    "emails": [
      "info@creditplus.kz"
    ]
  },
  {
    "name": "ТОО «МФО «SwF»",
    "category": "mfo",
    "address": "Aлмaты, ул. Xaджи Mукaнa, дoм 28",
    "bin": "240240008398",
    "phone": null,
    "emails": [
      "info@findom.kz"
    ]
  },
  {
    "name": "TOO «MФO «Бизнес займ»",
    "category": "other",
    "address": "г. Aлмaты, улица Тулебаева, дом 38/61",
    "bin": "240640009707",
    "phone": null,
    "emails": [
      "support@kengo.kz"
    ]
  },
  {
    "name": "TOO «MФO «MFO№1»",
    "category": "other",
    "address": "г. Aлмaты, Рыскулбекова, дом 28/8, н.п. 56",
    "bin": "210740030694",
    "phone": null,
    "emails": [
      "support@kviku.kz"
    ]
  },
  {
    "name": "ТОО «МФО «СиСиЛоун.кз»",
    "category": "mfo",
    "address": "г.Алматы, ул.Муратбаева, 180 офис 405",
    "bin": "151040016751",
    "phone": null,
    "emails": [
      "info@ccloan.kz"
    ]
  },
  {
    "name": "ТОО «МФО «FINBOX»",
    "category": "mfo",
    "address": "г. Алматы, улица Жамбыла, дом 114/85",
    "bin": "150940005022",
    "phone": null,
    "emails": [
      "info@akshamat.kz"
    ]
  },
  {
    "name": "ТОО «МФО «LEGAL MONEY»",
    "category": "mfo",
    "address": "Алматинская область, Илийский район, с. Аскар Токпанов, ул. К. Байкадамкызы, д. 71, кв. 2",
    "bin": "220440007472",
    "phone": null,
    "emails": [
      "info@neocredit.kz"
    ]
  },
  {
    "name": "TOO MФO «AUTO SIYLIQ FINANCE»",
    "category": "other",
    "address": "г. Aлмaты, пp.Н.Нaзapбaeвa, 223, н.п. 247, 6 этaж, блoк 2Б",
    "bin": "220240035629",
    "phone": null,
    "emails": [
      "info@acredit.kz"
    ]
  },
  {
    "name": "ТОО «МФО «Mogo Kazakhstan»",
    "category": "mfo",
    "address": "г.Алматы, пр.Назарбаева, дом 269А",
    "bin": "180940010094",
    "phone": null,
    "emails": [
      "ok@jetfin.kz"
    ]
  },
  {
    "name": "ТОО «СФК «р2п инвест КЗ»",
    "category": "other",
    "address": null,
    "bin": "180940000512",
    "phone": null,
    "emails": [
      "info@sfk.r2pinvest.kz"
    ]
  },
  {
    "name": "ТОО «МФО «ФРИДОМ ФИНАНС Кредит»",
    "category": "mfo",
    "address": "г.Алматы, пр. Сейфуллина, дом 502",
    "bin": "190340008954",
    "phone": null,
    "emails": [
      "info@ffin.credit"
    ]
  },
  {
    "name": "ТОО «Коллекторское агентство «ID Collect»",
    "category": "collector",
    "address": "г.Алматы, ул. Шевченко, д.162/7",
    "bin": "200840024621",
    "phone": null,
    "emails": [
      "info@idcollect.kz"
    ]
  },
  {
    "name": "АО «МФО «KMF»",
    "category": "mfo",
    "address": "г.Алматы, пр. Назарбаевп, д. 50",
    "bin": "061240001583",
    "phone": null,
    "emails": [
      "info@kmf.kz"
    ]
  },
  {
    "name": "АО «Alatau City Bank»",
    "category": "bank",
    "address": "г.Алматы, Проспект Назарбаева, 242",
    "bin": "920140000084",
    "phone": null,
    "emails": [
      "info@jusan.kz",
      "info@alataucitybank.kz"
    ]
  },
  {
    "name": "ТОО «МФО «TAS FINANCE GROUP»",
    "category": "mfo",
    "address": "область Абай, район Ақсуат, Аксуатский сельский округ, с. Аксуат, ул. Ы.Кабекова, 16",
    "bin": "100240019642",
    "phone": null,
    "emails": [
      "info@tascredit.kz"
    ]
  },
  {
    "name": "ТОО «МФО «R-Finance»",
    "category": "mfo",
    "address": "г.Астана, ул.Пушкина, зд. 75",
    "bin": "171040011328",
    "phone": null,
    "emails": [
      "office@r-finance.kz"
    ]
  },
  {
    "name": "ТОО «МФО «MyCar Finance»",
    "category": "mfo",
    "address": "г. Алматы, ул. Абиш Кекилбайулы, 34",
    "bin": "181240027056",
    "phone": null,
    "emails": [
      "nfo@mc-finance.kz"
    ]
  },
  {
    "name": "ТОО «СФО «Partner Group»",
    "category": "other",
    "address": "г.Алматы, улица Толе би, дом 155А",
    "bin": "240340022327",
    "phone": null,
    "emails": [
      "partnergroup@sfkpg.kz"
    ]
  },
  {
    "name": "ТОО «МФО MyCarFinance»",
    "category": "mfo",
    "address": "г. Алматы, ул. Абиш Кекилбайулы, 34, офис 16-02, 17-02",
    "bin": "181240027056",
    "phone": null,
    "emails": [
      "nfo@mc-finance.kz",
      "info@mc-finance.kz"
    ]
  },
  {
    "name": "ТОО «Коллекторское агентство «Эксперт Плюс»",
    "category": "collector",
    "address": "г.Алматы, пр.Назарбаева, дом 28А",
    "bin": "151040003422",
    "phone": null,
    "emails": [
      "kushumbaevark@explus.kz",
      "OpenOffice@explus.kz",
      "expert.collekt@gmail.com"
    ]
  },
  {
    "name": "ТОО «МФО «Шинхан Финанс»",
    "category": "mfo",
    "address": "г.Алматы, ул. Ауэзова, дом 48, 2 этаж, оф. 2/3",
    "bin": "141140019532",
    "phone": null,
    "emails": [
      "shf@shinhanfinance.kz"
    ]
  },
  {
    "name": "ТОО «Коллекторское агентство «FD Collection»",
    "category": "collector",
    "address": "Алматы, ул. Байзакова, зд. 125",
    "bin": "210840003175",
    "phone": null,
    "emails": [
      "office@fdc.kz"
    ]
  },
  {
    "name": "ТОО «МФО «Азиатский Кредитный Фонд» БИН:051040001396",
    "category": "mfo",
    "address": "г.Алматы, ул. Ауэзова, д.60",
    "bin": null,
    "phone": null,
    "emails": [
      "info@acfund.kz"
    ]
  },
  {
    "name": "в ТОО «МФО «Express Аванс»",
    "category": "mfo",
    "address": "г.Алматы, ул. Толе би, д. 298/2",
    "bin": "180140012253",
    "phone": null,
    "emails": [
      "help@timezaim.kz"
    ]
  },
  {
    "name": "ТОО «Коллекторское агентство «Kaz Collect»",
    "category": "collector",
    "address": "г.Алматы, ул. Толе би, дом 155А",
    "bin": "211140003251",
    "phone": null,
    "emails": [
      "info@kazcollect.kz"
    ]
  },
  {
    "name": "ТОО МФО «SF Offline» (СФ Оффлайн)",
    "category": "mfo",
    "address": "г.Алматы, Проспект Сейфуллина, дом 502",
    "bin": "210340023815",
    "phone": null,
    "emails": [
      "info@sfoffline.kz"
    ]
  },
  {
    "name": "ТОО «МФО CreditNOVA»",
    "category": "mfo",
    "address": "г.Алматы, ул. Толе би, дом 101",
    "bin": "151140014481",
    "phone": null,
    "emails": [
      "info@selfiecredit.kz"
    ]
  },
  {
    "name": "ТОО МФО «Симетра»",
    "category": "mfo",
    "address": "г. Алматы, пр. Рыскулова, дом 48А, офис 312.",
    "bin": "221240035790",
    "phone": null,
    "emails": [
      "official@finfive.kz"
    ]
  },
  {
    "name": "ТОО «МФО «El Qazyna»",
    "category": "mfo",
    "address": "Астана, Район Сарайшык, ул. Жұмекен Нәжімеденов, Д. 16б",
    "bin": "241140025991",
    "phone": null,
    "emails": [
      "mfokazynakredit@mail.ru"
    ]
  },
  {
    "name": "ТОО «МФО «MaxMoney»",
    "category": "mfo",
    "address": "г. Астана, район «Байконыр», проспект Бегенбай Батыр, здание №56А",
    "bin": "230240013372",
    "phone": null,
    "emails": [
      "info@mfomaxmoney.kz"
    ]
  },
  {
    "name": "ТОО «МФО «Moneyplus»",
    "category": "mfo",
    "address": null,
    "bin": "230440019359",
    "phone": null,
    "emails": [
      "support@moneyplus.kz"
    ]
  },
  {
    "name": "ТОО «МФО «ЮНИКРЕДО»",
    "category": "mfo",
    "address": "Алматы, ул. Жандосова, д.2",
    "bin": "191140009869",
    "phone": null,
    "emails": [
      "office@gmoney.kz"
    ]
  },
  {
    "name": "ТОО МФО «Экспресс Займ»",
    "category": "mfo",
    "address": "город Караганда, район имени Казыбек Би, Микрорайон Степной-2, дом 6/2",
    "bin": "150740011822",
    "phone": null,
    "emails": [
      "astanamfo@mail.ru"
    ]
  }
];
