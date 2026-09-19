// ============================================================
// TADASHI Mock Data — All Modules
// ============================================================

const DATA = {
  user: {
    name: 'Krishna Singh',
    initials: 'K',
    role: 'LifeOS User',
    lifeScore: 74,
    energyScore: 68,
    timezone: 'Asia/Kolkata'
  },

  lifeState: {
    schedule: 'Moderate load',
    availability: '2.5 hrs free today',
    workload: 72,
    financialState: 'On track',
    studyLoad: 'High (Exam Friday)',
    fitnessState: 'Active streak: 4 days',
    activeRisks: 3,
    pendingApprovals: 2
  },

  tasks: [
    { id:1, title:'Complete OS assignment', status:'todo', priority:'high', deadline:'2026-09-22', effort:3, project:'Study', tags:['urgent','coding'] },
    { id:2, title:'Gym — chest & triceps', status:'todo', priority:'medium', deadline:'2026-09-20', effort:1, project:'Fitness', tags:['health'] },
    { id:3, title:'Review monthly budget', status:'in-progress', priority:'high', deadline:'2026-09-21', effort:1, project:'Finance', tags:['money'] },
    { id:4, title:'Push project code to GitHub', status:'in-progress', priority:'high', deadline:'2026-09-20', effort:2, project:'Dev', tags:['coding','urgent'] },
    { id:5, title:'Call mom for her birthday', status:'todo', priority:'medium', deadline:'2026-09-20', effort:0, project:'Relationships', tags:['family'] },
    { id:6, title:'Read DBMS chapter 5', status:'todo', priority:'high', deadline:'2026-09-22', effort:2, project:'Study', tags:['exam-prep'] },
    { id:7, title:'Grocery shopping', status:'done', priority:'low', deadline:'2026-09-19', effort:1, project:'Home', tags:['errand'] },
    { id:8, title:'Pay electricity bill', status:'done', priority:'medium', deadline:'2026-09-18', effort:0, project:'Finance', tags:['bills'] },
    { id:9, title:'Update resume', status:'todo', priority:'medium', deadline:'2026-09-25', effort:2, project:'Career', tags:['career'] },
    { id:10, title:'Plan weekend study schedule', status:'todo', priority:'high', deadline:'2026-09-20', effort:1, project:'Study', tags:['planning'] },
  ],

  goals: [
    { id:1, emoji:'🎓', title:'Ace Final Exams', status:'active', progress:58, target:'2026-11-30', category:'Study',
      milestones:[
        { title:'Finish OS syllabus', done:true },
        { title:'Complete DBMS revision', done:false },
        { title:'Practice last 5 years papers', done:false },
        { title:'Mock tests', done:false }
      ]
    },
    { id:2, emoji:'💪', title:'Get to 75kg lean', status:'active', progress:45, target:'2026-12-31', category:'Fitness',
      milestones:[
        { title:'Consistent 5x/week gym', done:true },
        { title:'Track macros daily', done:true },
        { title:'Reach 78kg', done:false },
        { title:'Reach 75kg lean', done:false }
      ]
    },
    { id:3, emoji:'💰', title:'Save ₹50,000', status:'active', progress:72, target:'2026-12-31', category:'Finance',
      milestones:[
        { title:'Cut unnecessary subscriptions', done:true },
        { title:'Save ₹20,000', done:true },
        { title:'Save ₹36,000', done:false },
        { title:'Save ₹50,000', done:false }
      ]
    },
    { id:4, emoji:'🚀', title:'Launch Side Project', status:'on-hold', progress:18, target:'2027-03-31', category:'Dev',
      milestones:[
        { title:'Define MVP features', done:true },
        { title:'Build frontend', done:false },
        { title:'Build backend', done:false },
        { title:'Deploy & launch', done:false }
      ]
    },
  ],

  calendarEvents: [
    { id:1, title:'CS101 Lecture', date:'2026-09-20', time:'09:00', duration:90, type:'class', color:'cyan' },
    { id:2, title:'DBMS Lab', date:'2026-09-20', time:'11:00', duration:120, type:'class', color:'violet' },
    { id:3, title:'Gym Session', date:'2026-09-20', time:'17:30', duration:60, type:'fitness', color:'green' },
    { id:4, title:'OS Assignment Due', date:'2026-09-22', time:'23:59', duration:0, type:'deadline', color:'red' },
    { id:5, title:'OS Exam', date:'2026-09-26', time:'10:00', duration:180, type:'exam', color:'red' },
    { id:6, title:'Study Session — DBMS', date:'2026-09-21', time:'14:00', duration:120, type:'study', color:'amber' },
    { id:7, title:'Mom\'s Birthday Call', date:'2026-09-20', time:'20:00', duration:30, type:'personal', color:'pink' },
    { id:8, title:'Project Sync', date:'2026-09-22', time:'15:00', duration:60, type:'work', color:'cyan' },
    { id:9, title:'DBMS Exam', date:'2026-09-29', time:'10:00', duration:180, type:'exam', color:'red' },
    { id:10, title:'Weekend Workout', date:'2026-09-21', time:'08:00', duration:75, type:'fitness', color:'green' },
  ],

  fitness: {
    weeklyGoal: 5,
    weekDone: 4,
    currentStreak: 4,
    workouts: [
      { id:1, date:'2026-09-19', name:'Pull Day', status:'done', duration:65, exercises:[
        { name:'Pull-ups', sets:[{reps:10,weight:0},{reps:8,weight:0},{reps:7,weight:0}] },
        { name:'Barbell Row', sets:[{reps:10,weight:60},{reps:10,weight:60},{reps:8,weight:65}] },
        { name:'Bicep Curl', sets:[{reps:12,weight:20},{reps:12,weight:20},{reps:10,weight:22}] },
      ]},
      { id:2, date:'2026-09-20', name:'Push Day', status:'scheduled', duration:60, exercises:[
        { name:'Bench Press', sets:[{reps:10,weight:70},{reps:8,weight:75},{reps:6,weight:80}] },
        { name:'Overhead Press', sets:[{reps:10,weight:45},{reps:10,weight:45},{reps:8,weight:47.5}] },
        { name:'Tricep Pushdown', sets:[{reps:15,weight:25},{reps:15,weight:25},{reps:12,weight:27.5}] },
      ]},
    ],
    measurements: { weight: 80.5, height: 178, bodyFat: 18 },
    prs: [
      { exercise:'Bench Press', value:'82.5kg', date:'2026-09-10' },
      { exercise:'Squat', value:'100kg', date:'2026-09-05' },
      { exercise:'Deadlift', value:'120kg', date:'2026-08-28' },
    ]
  },

  nutrition: {
    today: { calories: 1840, target: 2200, protein: 142, proteinTarget: 180, carbs: 215, fat: 65, water: 1.8, waterTarget: 3.0 },
    meals: [
      { id:1, name:'Breakfast', time:'08:00', items:['Oats 80g','Banana','Eggs x2','Milk 250ml'], calories:520, protein:28 },
      { id:2, name:'Lunch', time:'13:00', items:['Rice 150g','Dal','Chicken 150g','Salad'], calories:680, protein:55 },
      { id:3, name:'Pre-Workout', time:'17:00', items:['Banana','Whey Protein'], calories:280, protein:30 },
      { id:4, name:'Dinner', time:'20:30', items:['Roti x2','Sabzi','Curd'], calories:360, protein:29 },
    ]
  },

  finance: {
    balance: 15420,
    monthlyIncome: 8000,
    monthlyExpenses: 5640,
    savings: 36800,
    savingsGoal: 50000,
    transactions: [
      { id:1, name:'Swiggy Order', category:'Food', date:'2026-09-19', amount:-280, icon:'🍕' },
      { id:2, name:'Pocket Money', category:'Income', date:'2026-09-18', amount:4000, icon:'💰' },
      { id:3, name:'Gym Membership', category:'Fitness', date:'2026-09-17', amount:-1200, icon:'💪' },
      { id:4, name:'Amazon Purchase', category:'Shopping', date:'2026-09-16', amount:-640, icon:'📦' },
      { id:5, name:'Netflix', category:'Entertainment', date:'2026-09-15', amount:-199, icon:'🎬' },
      { id:6, name:'Electricity Bill', category:'Utilities', date:'2026-09-14', amount:-820, icon:'⚡' },
      { id:7, name:'Freelance Payment', category:'Income', date:'2026-09-12', amount:4000, icon:'💼' },
    ],
    budgets: [
      { category:'Food', spent:1240, limit:2000 },
      { category:'Entertainment', spent:399, limit:500 },
      { category:'Shopping', spent:840, limit:1500 },
      { category:'Transport', spent:320, limit:600 },
    ]
  },

  study: {
    subjects: [
      { id:1, name:'Operating Systems', code:'CS401', examDate:'2026-09-26', progress:58,
        topics:[
          { name:'Process Management', status:'done' },
          { name:'Memory Management', status:'done' },
          { name:'File Systems', status:'partial' },
          { name:'Deadlocks', status:'todo' },
          { name:'I/O Systems', status:'todo' },
        ],
        assignments:[{ name:'OS Assignment', due:'2026-09-22', status:'pending' }]
      },
      { id:2, name:'Database Management', code:'CS402', examDate:'2026-09-29', progress:42,
        topics:[
          { name:'ER Model', status:'done' },
          { name:'Relational Algebra', status:'done' },
          { name:'SQL', status:'partial' },
          { name:'Normalization', status:'todo' },
          { name:'Transactions', status:'todo' },
        ],
        assignments:[]
      },
      { id:3, name:'Computer Networks', code:'CS403', examDate:'2026-10-05', progress:25,
        topics:[
          { name:'OSI Model', status:'done' },
          { name:'TCP/IP', status:'partial' },
          { name:'Routing', status:'todo' },
          { name:'Transport Layer', status:'todo' },
        ],
        assignments:[{ name:'Network Lab Report', due:'2026-09-28', status:'pending' }]
      },
    ]
  },

  shopping: {
    groceries: [
      { item:'Oats 1kg', qty:'1', status:'pending' },
      { item:'Eggs (dozen)', qty:'2', status:'pending' },
      { item:'Chicken breast', qty:'500g', status:'done' },
      { item:'Milk 1L', qty:'3', status:'pending' },
      { item:'Banana', qty:'1 dozen', status:'done' },
      { item:'Curd 400g', qty:'2', status:'pending' },
    ],
    wishlist: [
      { item:'Mechanical Keyboard', price:'₹4,500', priority:'medium', date:'2026-10-15' },
      { item:'Study Desk Lamp', price:'₹800', priority:'low', date:'2026-11-01' },
      { item:'Running Shoes', price:'₹3,200', priority:'high', date:'2026-09-28' },
    ]
  },

  relationships: [
    { id:1, name:'Mom', category:'Family', birthday:'1975-09-20', lastContact:'2026-09-15', notes:'Call every week', emoji:'👩' },
    { id:2, name:'Dad', category:'Family', birthday:'1970-04-12', lastContact:'2026-09-18', notes:'', emoji:'👨' },
    { id:3, name:'Rohan Sharma', category:'Friend', birthday:'2002-12-05', lastContact:'2026-09-10', notes:'Gym buddy', emoji:'🧑' },
    { id:4, name:'Prof. Mehta', category:'Mentor', birthday:null, lastContact:'2026-09-16', notes:'OS professor', emoji:'👨‍🏫' },
    { id:5, name:'Priya Singh', category:'Classmate', birthday:'2003-06-18', lastContact:'2026-09-19', notes:'Group project partner', emoji:'👩‍💻' },
  ],

  homeModule: {
    chores: [
      { task:'Room cleaning', frequency:'Weekly', lastDone:'2026-09-16', status:'due' },
      { task:'Laundry', frequency:'2x/week', lastDone:'2026-09-18', status:'ok' },
      { task:'Bathroom cleaning', frequency:'Weekly', lastDone:'2026-09-13', status:'overdue' },
      { task:'Restock grocery', frequency:'Weekly', lastDone:'2026-09-19', status:'ok' },
      { task:'Air filter cleaning', frequency:'Monthly', lastDone:'2026-09-01', status:'ok' },
    ],
    utilities: [
      { name:'Rent', amount:'₹8,000', due:'2026-10-01', status:'upcoming' },
      { name:'Electricity', amount:'₹820', due:'2026-10-10', status:'upcoming' },
      { name:'WiFi', amount:'₹599', due:'2026-09-25', status:'upcoming' },
    ]
  },

  vehicle: {
    make:'Honda', model:'Activa 6G', year:2022, plate:'MP09-AB-1234',
    fuel:72, fuelUnit:'%',
    odometer: 8420,
    nextService: '2026-10-15',
    insurance: { expiry:'2027-02-28', provider:'HDFC ERGO' },
    puc: { expiry:'2026-11-30' },
    fuelLogs: [
      { date:'2026-09-12', liters:3.2, amount:240, odometer:8350 },
      { date:'2026-09-05', liters:2.8, amount:210, odometer:8180 },
    ]
  },

  travel: {
    trips: [
      { id:1, dest:'Goa', start:'2026-12-23', end:'2026-12-28', status:'planned', budget:15000, spent:2500, emoji:'🏖️',
        itinerary:[
          { day:'Day 1', items:[{time:'14:00',event:'Arrive Goa, check-in hotel'},{time:'18:00',event:'Baga Beach sunset'}] },
          { day:'Day 2', items:[{time:'09:00',event:'North Goa sightseeing'},{time:'20:00',event:'Dinner at Curlies'}] },
          { day:'Day 3', items:[{time:'10:00',event:'Dudhsagar Falls trip'},{time:'19:00',event:'Anjuna flea market'}] },
        ],
        packing:['Clothes x5 sets','Sunscreen','Camera','ID proof','Flip flops']
      }
    ]
  },

  documents: [
    { id:1, name:'Aadhaar Card', type:'Identity', expiry:null, size:'2.4 MB', icon:'🪪', tags:['identity','govt'] },
    { id:2, name:'PAN Card', type:'Identity', expiry:null, size:'1.1 MB', icon:'💳', tags:['identity','tax'] },
    { id:3, name:'Vehicle Insurance', type:'Insurance', expiry:'2027-02-28', size:'3.2 MB', icon:'🚗', tags:['vehicle','insurance'] },
    { id:4, name:'College ID', type:'Academic', expiry:'2027-05-30', size:'0.8 MB', icon:'🎓', tags:['academic'] },
    { id:5, name:'Medical Report', type:'Medical', expiry:null, size:'4.5 MB', icon:'🏥', tags:['health'] },
    { id:6, name:'PUC Certificate', type:'Vehicle', expiry:'2026-11-30', size:'0.5 MB', icon:'📄', tags:['vehicle'] },
    { id:7, name:'Marksheet Sem 5', type:'Academic', expiry:null, size:'1.8 MB', icon:'📋', tags:['academic','grades'] },
  ],

  knowledge: [
    { id:1, type:'Note', title:'Spring Boot best practices', preview:'Use @Transactional on service layer, not repository. Prefer constructor injection over field injection...', date:'2026-09-18', tags:['coding','java'] },
    { id:2, type:'Idea', title:'TADASHI cross-domain replanning algorithm', preview:'When a major event changes, traverse Life Graph DFS, calculate constraint impact scores...', date:'2026-09-17', tags:['project','ai'] },
    { id:3, type:'Book Note', title:'Atomic Habits — Key Takeaways', preview:'1% better every day compounds to 37x in a year. Focus on systems not goals. Make habits obvious, attractive...', date:'2026-09-10', tags:['books','habits'] },
    { id:4, type:'Journal', title:'Weekly reflection Sep 15-19', preview:'Productive week overall. Missed 1 gym session. OS assignment needs focus. Should start DBMS revision earlier...', date:'2026-09-19', tags:['journal','reflection'] },
    { id:5, type:'Project Idea', title:'Automated campus schedule optimizer', preview:'ML model to optimize student schedules based on energy, preferences, exam proximity...', date:'2026-09-08', tags:['idea','ml','college'] },
  ],

  routines: {
    morning: [
      { task:'Wake up', time:'06:30', done:true },
      { task:'Drink 500ml water', time:'06:31', done:true },
      { task:'Morning workout / walk', time:'06:45', done:false },
      { task:'Shower', time:'07:30', done:false },
      { task:'Breakfast', time:'08:00', done:false },
      { task:'Review today\'s plan', time:'08:30', done:false },
    ],
    night: [
      { task:'Stop screen 30 min before bed', time:'22:30', done:false },
      { task:'Journal / reflection', time:'22:35', done:false },
      { task:'Review tomorrow\'s plan', time:'22:45', done:false },
      { task:'Sleep', time:'23:00', done:false },
    ],
    sleep: { target:'23:00', wake:'06:30', lastNight: 7.1 }
  },

  wellbeing: {
    todayMood: null,
    moodHistory: [4,3,5,4,4,3,5],
    stressLevel: 3,
    weeklyCheckins: 5,
    breaks: [
      { time:'12:30', duration:'10 min', type:'Walk' },
      { time:'16:00', duration:'15 min', type:'Stretch' },
    ]
  },

  digitalLife: {
    subscriptions: [
      { name:'Netflix', icon:'🎬', amount:199, period:'mo', renewal:'2026-10-05', status:'active', color:'#E50914' },
      { name:'Spotify', icon:'🎵', amount:119, period:'mo', renewal:'2026-10-12', status:'active', color:'#1DB954' },
      { name:'GitHub Pro', icon:'💻', amount:0, period:'mo', renewal:null, status:'free', color:'#333' },
      { name:'iCloud 50GB', icon:'☁️', amount:75, period:'mo', renewal:'2026-10-08', status:'active', color:'#3B82F6' },
      { name:'JetBrains', icon:'🧠', amount:0, period:'yr', renewal:null, status:'student-free', color:'#E10054' },
    ]
  },

  entertainment: [
    { id:1, type:'Movie', title:'Oppenheimer', status:'watched', rating:5, emoji:'🎬', genre:'Biographical' },
    { id:2, type:'Show', title:'Breaking Bad', status:'watching', progress:78, emoji:'📺', genre:'Crime' },
    { id:3, type:'Book', title:'Atomic Habits', status:'done', rating:5, emoji:'📚', genre:'Self-help' },
    { id:4, type:'Book', title:'Deep Work', status:'reading', progress:45, emoji:'📖', genre:'Productivity' },
    { id:5, type:'Game', title:'Chess (Lichess)', status:'active', emoji:'♟️', genre:'Strategy' },
    { id:6, type:'Movie', title:'Interstellar', status:'want-to-watch', emoji:'🚀', genre:'Sci-Fi' },
    { id:7, type:'Show', title:'Chernobyl', status:'want-to-watch', emoji:'☢️', genre:'Historical' },
  ],

  analytics: {
    productivity: [65,72,58,80,74,68,82],
    spending: [4200,5100,3800,5640,4900,5200,4600],
    fitness: [3,4,5,4,5,4,5],
    nutrition: [78,82,70,85,80,75,88],
    studyHours: [2,3.5,1,4,3,2.5,4.5],
    sleepHours: [7.5,6.5,8,7,7.5,6,7.1],
    days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  },

  notifications: [
    { id:1, type:'risk', icon:'⚠️', iconBg:'rgba(245,158,11,0.15)', title:'OS Exam in 6 days', desc:'You are 42% through the syllabus. TADASHI recommends 3 study sessions this week.', time:'2 min ago', unread:true },
    { id:2, type:'reminder', icon:'💪', iconBg:'rgba(16,185,129,0.15)', title:'Gym session scheduled at 5:30 PM', desc:'Push day — Bench Press, OHP, Triceps', time:'15 min ago', unread:true },
    { id:3, type:'replan', icon:'🔄', iconBg:'rgba(0,212,255,0.15)', title:'TADASHI proposed a replan', desc:'"Fix my week" request created 8 changes. Review & approve.', time:'1 hr ago', unread:true },
    { id:4, type:'finance', icon:'💰', iconBg:'rgba(245,158,11,0.15)', title:'Budget alert: Food (₹1,240/₹2,000)', desc:'62% of monthly food budget used by day 19. On track.', time:'3 hrs ago', unread:false },
    { id:5, type:'birthday', icon:'🎂', iconBg:'rgba(236,72,153,0.15)', title:"Mom's birthday is today!", desc:'Don\'t forget to call. Scheduled reminder at 8 PM.', time:'5 hrs ago', unread:false },
  ],

  tadashiMessages: [
    { role:'tadashi', content:"Good evening, Krishna! 🌙 Here's your life state:\n\n**Today's priorities:**\n1. OS Assignment due in 3 days — you need 4–5 more hours\n2. Push Day gym session at 5:30 PM\n3. Call Mom — it's her birthday!\n\n**Risks detected:**\n⚠️ OS Exam on Sep 26 — only 58% syllabus done\n⚠️ Bathroom cleaning overdue\n\nWhat would you like to tackle first?", time:'21:54' },
  ]
};
