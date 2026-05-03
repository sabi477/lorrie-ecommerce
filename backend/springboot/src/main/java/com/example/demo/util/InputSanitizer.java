package com.example.demo.util;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class InputSanitizer {

    private static final String[] PROFANITY_WORDS = {
        "amk","amq","amık","amık","a.m.k","a.mq","a mk","a mq","aq","a.q","a q",
        "anani","ananı","anan","babanı","baban","götün","götun","göt","got",
        "amcığ","amcık","amcig","amck","amcıg","amcık","amcg","amck",
        "amına","amină","amına","omina",
        "yarrak","yarak","yarram","yarakam","yarrami","yaraklık","yaraklik",
        "sikim","sikeyim","sikti","siktim","sikdir","sikdor","sikder",
        "s1k","s!k","sık","sıkk","sıkı","s1k1","s!k!","s!k1","s1k!",
        "s1kim","s!keyim","s1ktim","s1ktir",
        "siktir","siktirgit","siktirgit","siktir et","siktirger","siktirgit",
        "sokucu","sokak","sokar","sokucu","sokuş","soktum","sokmak",
        "oruspu","orospu","orusp","orosp","orosbu","orospo","orospv","orospu",
        "oç","oçsum","oçsim","oçsumo","oçsum","oçsim","oc","o.c","o c",
        "şerefsiz","şerefsizce","şerefiz","şerefsizlik","şerefsizce",
        "porn","porno","pornhub","xvid","xvıd","sex","seks","sekş","sekis",
        "lgbt","lgbtq","trans","gey","gay","lezbiyen","biseksüel",
        "fahişe","fahise","fahişe","fahişey","fahiş","fahise",
        "taciz","tacizci","taciz edilmiş","taciz et","taciz",
        "tecavüz","tecavuz","tecavüzci","tecavuz et",
        "gerizekalı","gerizekalı","gerızekalı","gerizekalh","gerizekalu",
        "mal","malık","malesef","malese","males","mall",
        "ezik","ezık","eizk","ızik","ızık","iizk","eezik",
        "aptal","aptalca","aptalım","aptal","bıdı","bıdık",
        "hıyar","hıyara","hıyarım","hıyarcık","hiyar","hııyar","hııyarr",
        "kaltık","kaltak","kaltık","kaltig","kaltik",
        "keriz","kerizim","kerizler","keriz","kirez","keriz",
        "cip","cıp","çip","cip","çipp","cipp",
        "zitung","zitung","zuntun","zunt","zang","zıng",
        "zart","zort","zartı","zortu","zurt","zırt",
        "pıçı","pıcı","picı","pic","pıç","pıçık","pıçıltı",
        "poşet","poshet","poset","poşet","poşet",
        "çomar","çomár","comar","çomar","çömär",
        "pic","pıc","pİc","pıç","piç","pıck","pıcık","pick",
        "liboş","liboşlar","libos","liboşum","liboşum","liboş",
        "daşşak","daşak","daşşak","dashak","daşak","daşşak",
        "it","ıt","itler","itlerim","ıtler","ıtlerim",
        "göt","got","götü","göt","gote","gotu","götu",
        "sıçtı","sıçti","sıç","sicti","siçti","sıçtı","sıçt",
        "sıgar","sigara","sigar","sıgar","s1gar","s!gar",
        "şıllık","şıllig","şillik","şıllı","şılık","şilık",
        "ştf","stf","şitf","sıtf","sıtıf","şitıf",
        "tşk","tşkler","tsk","tşkk","tşk","tşkü",
        "mrb","mrbk","meraba","merhab","mrbr","mrb",
        "oruç","oruc","orç","oruç","orunc","orunç",
        "peçete","pecete","peçete","peçet","peçeet",
        "pust","pustu","pusht","pus","pusu","pust",
        "kro","kroo","kroo","kru","kro",
        "merdiven","merdıven","merdivan","merdyen","merdyven",
        "defol","defolgit","defolun","defolam","defole","defoluyo",
        "şube","şubat","sube","şübe","sübe","subye",
        "hack","hacker","hacking","h4ck","h4ck3r","hackle",
        "crack","cracker","cracking","cr4ck","cr4ck3r","crackle",
        "案","你","妈","逼","屌","毛泽东","习近平","共产党","天安门","av","a v","a.v",
        "mgm","mg","mgk","mkg","mkk","mkgk","m.g.k","m.g","m.k","m.k.",
        "mk","mkk","mkre","mkrek","mkr","mk r","m k","m k r","mkı","mki",
        "sg","sgg","sgm","sggm","s g","s g g","s.g","s.g.","s.g.m",
        "yaraklık","yaraklik","yarakligh","yaraklı","yarakli","yarağım",
        "bombok","bomok","bomkö","bomke","bomko","bombokk","bomokk",
        "şerefsizim","şerefsizsin","şerefsizdir","şerefsizz","şerefsız",
        "anlıyorum","anlamıyorum","bok","bokum","boku","bokum","boklar","boktan",
        "sifari","siyari","sıyari","şıyari","siyari","shiyari",
        "fık","fik","fıkır","fikir","fikır","fıkı","fiki",
        "salak","salakça","salaklık","salaklig","slak","sallak",
        "civatal","cıvatal","cıvıt","civit","cıvıt",
        "mb","mbl","mbq","mbak","mba","emb","embn","emb",
        "a+q","apq","amkq","amgk","amgk","amq","amkk","amk.",
        "gerzekalı","gerzekalı","gerzkkalı","gerzekalig","gerzeykalı",
        "götveren","gotveren","götverenim","götverenler","gotveren",
        "şıllık","şılık","şillik","şılık","şıllig",
        "ebedi","ebedi","ebed","ebedim","ebet",
        "lan","lann","lannn","lanı","len","leni","lanci","lanc",
        "bı","bii","biii","bş","bşk","bşkı","bşkim",
        "sülün","sülun","sülüncük","süleyman","sulun","suluncu",
        "asdf","asdfg","asdfgh","qwer","qwerty","zxcv","zxcvbn",
        "bütün","butun","butün","bütdün","buyun","buyum",
        "kıllım","kıllın","killim","kılım","kılın","kiliim",
        "fistan","fıstan","fistın","fistank","fistn",
        "şarap","sirap","şarap","sarp","şarp","sarap",
        "zıkkım","zıkkımın","zıkkımı","zıkkım","zıkkum",
        "müslüman","musluman","musılman","musuluman","müslim",
        "kafir","kafır","kafir","kafirler","kafir",
        "şınav","şınak","sınav","sinav","snav","shnav",
        "yavşak","yavşak","yavşaklık","yavlak","yavş","yavsak",
        "manyak","manyak","manyaklar","manyaklık","manyakca",
        "pıs","pıss","piss","pısss","pis","pisss",
        "ağa","ağam","ağaz","ağe","ağ","agha","agım",
        "çük","çüks","cuks","cuçu","çüçü","cük",
        "göt","götün","gotum","gotun","gotu","got",
        "pıt","pıtt","pit","pittt","pitı","piti",
        "şıt","şıtt","şit","şıttt","şiti","şiti",
        "aşk","ask","askım","aşkim","aşkım","askiim",
        "orospu","oruspu","orusbu","orospv","orospu",
        "sik","sikim","sikil","sikilir","sikimi","sikimden",
        "siktir","siktirgit","siktirgit","siktir et","siktirger",
        "fahişe","fahise","fahişey","fahise","fahiş",
        "zina","zına","zinak","zinacı","zinaet",
        "İblis","iblis","iblıs","iblis","i̇blis",
        "şeytan","seytan","şeytan","seyton","şeyt","şeytın",
        "lanet","lanetli","lanetle","lânet","lnet",
        "beddua","bedua","bedduaet","bedduam","beddua",
        "teşekkür","tşk","tşkk","tsk","tşkler","teşekur",
        "是有","是有为","下流","色情","穆斯林","维尼","国家主席","国家领导",
        "共产党","共产党员","主席","书记","万岁","打倒","反动","特供",
        "腊肉","蛤蟆","天安门","坦克","1989","freetibet","freeuighur",
        "tibet","uyghur","xinjiang","taiwan independence","台独",
        "特朗普","拜登","沙皇","普京","Russia","Putin"
    };

    private static final Set<String> PROFANITY_SET = new HashSet<>(Arrays.asList(PROFANITY_WORDS));

    private static String normalizeText(String input) {
        if (input == null) return null;
        String normalized = input.toLowerCase();
        normalized = normalized.replace('@', 'a').replace('4', 'a').replace('3', 'e');
        normalized = normalized.replace('1', 'i').replace('!', 'i').replace('|', 'i').replace('ı', 'i');
        normalized = normalized.replace('0', 'o').replace('6', 'g').replace('9', 'g');
        normalized = normalized.replace('$', 's').replace('5', 's');
        normalized = normalized.replace('7', 't').replace('8', 'b');
        normalized = normalized.replace('ç', 'c').replace('ü', 'u').replace('ö', 'o');
        normalized = normalized.replace('ş', 's').replace('ğ', 'g');
        return normalized;
    }

    private static String containsProfanity(String input) {
        if (input == null) return null;
        String normalized = normalizeText(input);
        for (String word : PROFANITY_SET) {
            if (normalized.contains(word)) {
                return word;
            }
        }
        for (String word : PROFANITY_SET) {
            if (input.toLowerCase().contains(word)) {
                return word;
            }
        }
        return null;
    }

    /**
     * Tüm HTML/script taglarını, SQL anahtar kelimelerini ve
     * tehlikeli karakterleri temizler. Sadece düz metin döner.
     */
    public static String sanitize(String input) {
        if (input == null) return null;

        String cleaned = Jsoup.clean(input, Safelist.none());
        cleaned = cleaned.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "");

        String[] sqlPatterns = {
            "(?i)(--|;|/\\*|\\*/)",
            "(?i)\\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|UNION|SELECT|FROM|WHERE|OR|AND)\\b\\s*(TABLE|DATABASE|SCHEMA|INTO|FROM|\\*|--|;)"
        };
        for (String pattern : sqlPatterns) {
            cleaned = cleaned.replaceAll(pattern, "");
        }

        cleaned = cleaned.replaceAll("(?i)(javascript|vbscript|data:|on\\w+\\s*=)", "");

        return cleaned.trim();
    }

    public static boolean containsProfanity(String input, int minLen, int maxLen) {
        if (input == null) return true;
        String sanitized = sanitize(input);
        if (sanitized == null) return true;
        String trimmed = sanitized.trim();
        if (trimmed.length() < minLen || trimmed.length() > maxLen) return true;
        return containsProfanity(sanitized) != null;
    }

    public static String getProfanityWord(String input) {
        if (input == null) return null;
        return containsProfanity(sanitize(input));
    }

    /**
     * Temizlenmiş metnin geçerli olup olmadığını kontrol eder.
     * Boş veya çok kısa yorumları reddeder.
     */
    public static boolean isValid(String sanitized, int minLen, int maxLen) {
        if (sanitized == null) return false;
        int len = sanitized.trim().length();
        return len >= minLen && len <= maxLen;
    }
}
