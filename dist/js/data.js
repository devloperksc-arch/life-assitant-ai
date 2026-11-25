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
    { id:1, title:'LeetCode Python 150 — Solve 3 Tree & DFS problems', status:'todo', priority:'high', deadline:'2026-11-25', effort:2, project:'Code', tags:['urgent','python','leetcode'] },
    { id:2, title:'Gym — Push Day: Bench Press & Triceps', status:'todo', priority:'high', deadline:'2026-11-25', effort:1, project:'Fitness', tags:['health','gym'] },
    { id:3, title:'NSS Core Meeting — Finalize Blood Donation Camp Roster', status:'todo', priority:'high', deadline:'2026-11-25', effort:2, project:'NSS', tags:['urgent','social'] },
    { id:4, title:'Call Maa & Papa — Daily evening family check-in', status:'todo', priority:'high', deadline:'2026-11-25', effort:0, project:'Relationships', tags:['family','priority'] },
    { id:5, title:'AI Lab — Implement A* Search algorithm in Python', status:'in-progress', priority:'high', deadline:'2026-11-27', effort:3, project:'Study', tags:['ai','coding'] },
    { id:6, title:'Computer Networks — Socket programming client-server demo', status:'todo', priority:'medium', deadline:'2026-11-28', effort:2, project:'Study', tags:['networks','lab'] },
    { id:7, title:'Software Engineering — Sprint 2 Backlog & UML Architecture', status:'in-progress', priority:'medium', deadline:'2026-11-29', effort:2, project:'Study', tags:['se','agile'] },
    { id:8, title:'Expert Systems — Rule-based inference engine problem set', status:'todo', priority:'medium', deadline:'2026-11-30', effort:2, project:'Study', tags:['expert-systems'] },
    { id:9, title:'Track daily macros & 180g protein target', status:'done', priority:'medium', deadline:'2026-11-25', effort:0, project:'Fitness', tags:['nutrition'] },
    { id:10, title:'Plan weekly LeetCode milestone (Reach 55/150)', status:'todo', priority:'medium', deadline:'2026-11-26', effort:1, project:'Career', tags:['career','python'] },
  ],

  goals: [
    { id:1, emoji:'🐍', title:'Crack LeetCode 150 in Python', status:'active', progress:32, target:'2026-12-31', category:'Dev',
      milestones:[
        { title:'Arrays & Hashing (9/9)', done:true },
        { title:'Two Pointers & Sliding Window (11/11)', done:true },
        { title:'Trees & Binary Search (14/28)', done:false },
        { title:'Graphs & Dynamic Programming (0/40)', done:false }
      ]
    },
    { id:2, emoji:'🎓', title:'Ace Semester Exams (AI, SE, Networks, Expert Systems)', status:'active', progress:64, target:'2026-12-20', category:'Study',
      milestones:[
        { title:'Artificial Intelligence: A* & Minimax', done:true },
        { title:'Computer Networks: TCP/IP & Subnetting', done:true },
        { title:'Software Engineering: Design Patterns & UML', done:false },
        { title:'Expert Systems: Rule-based inference', done:false }
      ]
    },
    { id:3, emoji:'💪', title:'Get to 75kg Lean & 90kg Bench Press', status:'active', progress:55, target:'2026-12-31', category:'Fitness',
      milestones:[
        { title:'Consistent 5x/week gym streak', done:true },
        { title:'Track 180g protein daily', done:true },
        { title:'Bench Press 85kg hit', done:false },
        { title:'Reach 75kg lean body weight', done:false }
      ]
    },
    { id:4, emoji:'🤝', title:'NSS Youth Leadership & Community Impact', status:'active', progress:78, target:'2026-12-15', category:'Social',
      milestones:[
        { title:'Campus cleanliness drive lead', done:true },
        { title:'Blood donation camp roster & logistics', done:false },
        { title:'Weekend village literacy workshop', done:false }
      ]
    },
  ],

  calendarEvents: [
    { id:1, title:'Gym — Push Day (Bench & Triceps)', date:'2026-11-25', time:'07:00', duration:75, type:'fitness', color:'green' },
    { id:2, title:'Artificial Intelligence Lecture (A* Search & Heuristics)', date:'2026-11-25', time:'09:30', duration:90, type:'class', color:'cyan' },
    { id:3, title:'Computer Networks (TCP/IP & Packet Routing)', date:'2026-11-25', time:'11:15', duration:90, type:'class', color:'violet' },
    { id:4, title:'Software Engineering Lab (Agile Sprint & UML)', date:'2026-11-25', time:'14:00', duration:90, type:'class', color:'cyan' },
    { id:5, title:'NSS Committee Meeting (Blood Donation Camp Briefing)', date:'2026-11-25', time:'16:30', duration:60, type:'work', color:'amber' },
    { id:6, title:'LeetCode Python 150 Sprint (Trees & DFS)', date:'2026-11-25', time:'18:00', duration:90, type:'study', color:'cyan' },
    { id:7, title:'Call Maa & Papa (Daily Family Check-in)', date:'2026-11-25', time:'20:30', duration:30, type:'personal', color:'pink' },
    { id:8, title:'Expert Systems Study (Inference Engines & Rules)', date:'2026-11-25', time:'21:30', duration:60, type:'study', color:'violet' },
    { id:9, title:'AI Lab Python Assignment Due', date:'2026-11-27', time:'23:59', duration:0, type:'deadline', color:'red' },
    { id:10, title:'Weekend NSS Outreach & Literacy Drive', date:'2026-11-29', time:'09:00', duration:180, type:'personal', color:'green' },
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
    balance: 42650,
    monthlyIncome: 65000,
    monthlyExpenses: 36800,
    savings: 145000,
    savingsGoal: 200000,
    travelSavingsFund: 22000,
    budgets: [
      { id: 'b1', category: 'Food & Groceries', spent: 4650, limit: 8000, icon: 'restaurant', color: '#6af7ba' },
      { id: 'b2', category: 'Gym & Supplements', spent: 2400, limit: 4000, icon: 'fitness_center', color: '#00d4ff' },
      { id: 'b3', category: 'Bike Fuel & Wash', spent: 1800, limit: 3500, icon: 'two_wheeler', color: '#d0bcff' },
      { id: 'b4', category: 'Travel & Trips Fund', spent: 5000, limit: 8000, icon: 'flight', color: '#3cd7ff' },
      { id: 'b5', category: 'Shopping & D-Mart', spent: 3800, limit: 6000, icon: 'shopping_bag', color: '#f59e0b' },
      { id: 'b6', category: 'Tech & Subscriptions', spent: 1299, limit: 2500, icon: 'devices', color: '#a855f7' },
      { id: 'b7', category: 'Utilities & Bills', spent: 3100, limit: 4000, icon: 'bolt', color: '#f43f5e' }
    ],
    transactions: [
      { id: 1, name: 'D-Mart Grocery & Household Restock', category: 'Food & Groceries', date: '2026-10-01', amount: -2850, icon: '🛒' },
      { id: 2, name: 'Monthly Software / Freelance Inflow', category: 'Income', date: '2026-10-01', amount: 45000, icon: '💼' },
      { id: 3, name: 'Whey Protein Isolate & Creatine', category: 'Gym & Supplements', date: '2026-09-28', amount: -3800, icon: '💪' },
      { id: 4, name: 'Royal Enfield Foam Wash & Motul Lube', category: 'Bike Fuel & Wash', date: '2026-09-24', amount: -450, icon: '🏍️' },
      { id: 5, name: 'Goa Coastal Trip Advance Booking', category: 'Travel & Trips Fund', date: '2026-09-20', amount: -2500, icon: '🏖️' },
      { id: 6, name: 'Petrol Fill Classic 350 (Full Tank)', category: 'Bike Fuel & Wash', date: '2026-09-18', amount: -1100, icon: '⛽' },
      { id: 7, name: 'GitHub Copilot + Cloud VPS', category: 'Tech & Subscriptions', date: '2026-09-15', amount: -980, icon: '⚡' }
    ]
  },

  study: {
    subjects: [
      { id:1, name:'Artificial Intelligence', code:'CS501', examDate:'2026-12-10', progress:68,
        topics:[
          { name:'State Space & Heuristic Search (A*, IDA*)', status:'done' },
          { name:'Adversarial Search & Minimax Alpha-Beta', status:'done' },
          { name:'Knowledge Representation & First-Order Logic', status:'partial' },
          { name:'Probabilistic Reasoning & Bayes Nets', status:'todo' },
          { name:'Machine Learning Foundations & Neural Nets', status:'todo' },
        ],
        assignments:[{ name:'AI Lab: A* Search in Python', due:'2026-11-27', status:'pending' }]
      },
      { id:2, name:'Expert Systems', code:'CS502', examDate:'2026-12-14', progress:52,
        topics:[
          { name:'Expert Systems Architecture', status:'done' },
          { name:'Forward & Backward Chaining Inference', status:'done' },
          { name:'Rule-Based Knowledge Representation', status:'partial' },
          { name:'Conflict Resolution Strategies', status:'todo' },
          { name:'CLIPS / Prolog Engine Integration', status:'todo' },
        ],
        assignments:[{ name:'Medical Diagnosis Rule Engine', due:'2026-11-30', status:'pending' }]
      },
      { id:3, name:'Software Engineering', code:'CS503', examDate:'2026-12-18', progress:72,
        topics:[
          { name:'Agile, Scrum & Kanban Methodologies', status:'done' },
          { name:'Requirements Engineering & User Stories', status:'done' },
          { name:'UML Class, Sequence & Activity Diagrams', status:'done' },
          { name:'Design Patterns (Creational, Structural, Behavioral)', status:'partial' },
          { name:'CI/CD Pipelines, Testing & DevOps', status:'todo' },
        ],
        assignments:[{ name:'Sprint 2 Architecture & UML Document', due:'2026-11-29', status:'pending' }]
      },
      { id:4, name:'Computer Networks', code:'CS504', examDate:'2026-12-22', progress:45,
        topics:[
          { name:'OSI & TCP/IP Protocol Layers', status:'done' },
          { name:'Data Link & MAC Addressing', status:'done' },
          { name:'IPv4 / IPv6 Addressing & Subnetting', status:'partial' },
          { name:'Routing Protocols (OSPF, BGP, RIP)', status:'todo' },
          { name:'Transport Layer: TCP Congestion Control & UDP', status:'todo' },
        ],
        assignments:[{ name:'Socket Programming Client-Server Demo', due:'2026-11-28', status:'pending' }]
      },
      { id:5, name:'Python Essentials & LeetCode 150', code:'CS505', examDate:'2026-12-30', progress:32,
        topics:[
          { name:'Arrays & Hashing (9/9 solved)', status:'done' },
          { name:'Two Pointers & Sliding Window (11/11 solved)', status:'done' },
          { name:'Stack & Binary Search (8/12 solved)', status:'partial' },
          { name:'Trees & Binary Search Trees (10/20 solved)', status:'partial' },
          { name:'Graphs & Dynamic Programming (0/40 solved)', status:'todo' },
        ],
        assignments:[{ name:'Daily 3 LeetCode Python Sprint', due:'2026-11-25', status:'pending' }]
      },
    ]
  },

  shopping: {
    dmartList: [
      { id: 1, item: 'Rolled Oats 1kg', category: 'Groceries', qty: '2 packs', estPrice: 380, urgency: 'high', checked: false },
      { id: 2, item: 'Peanut Butter (1kg Unsweetened)', category: 'Groceries', qty: '1 jar', estPrice: 420, urgency: 'high', checked: false },
      { id: 3, item: 'Surf Excel Detergent Powder', category: 'Household', qty: '2 kg', estPrice: 280, urgency: 'medium', checked: false },
      { id: 4, item: 'Dettol Liquid Handwash Refill', category: 'Personal Care', qty: '1 pouch', estPrice: 190, urgency: 'medium', checked: false },
      { id: 5, item: 'Basmati Rice (Daawat / India Gate)', category: 'Groceries', qty: '5 kg', estPrice: 450, urgency: 'high', checked: true },
      { id: 6, item: 'Sensodyne Rapid Relief Toothpaste', category: 'Personal Care', qty: '1 pack', estPrice: 160, urgency: 'low', checked: false },
      { id: 7, item: 'Vim Lemon Dishwash Bar & Scrubber', category: 'Household', qty: '3 pk', estPrice: 85, urgency: 'medium', checked: false },
      { id: 8, item: 'Dry Fruits (Almonds & Walnuts)', category: 'Groceries', qty: '500g', estPrice: 650, urgency: 'medium', checked: false },
      { id: 9, item: 'Garbage Bags (Medium 30 pcs)', category: 'Household', qty: '1 roll', estPrice: 110, urgency: 'low', checked: true }
    ],
    pantryStock: [
      { id: 1, item: 'Rolled Oats', status: 'Out of Stock', category: 'Pantry', location: 'Top Shelf', minQty: '1 kg', currentQty: '0g' },
      { id: 2, item: 'Peanut Butter', status: 'Running Low', category: 'Pantry', location: 'Fridge Door', minQty: '500g', currentQty: '50g' },
      { id: 3, item: 'Basmati Rice', status: 'In Stock', category: 'Pantry', location: 'Bottom Bin', minQty: '2 kg', currentQty: '5 kg' },
      { id: 4, item: 'Eggs', status: 'In Stock', category: 'Fridge', location: 'Egg Tray', minQty: '12', currentQty: '18' },
      { id: 5, item: 'Olive Oil', status: 'In Stock', category: 'Kitchen', location: 'Counter', minQty: '500ml', currentQty: '1 L' },
      { id: 6, item: 'Surf Excel', status: 'Running Low', category: 'Laundry', location: 'Bathroom Shelf', minQty: '1 kg', currentQty: '200g' },
      { id: 7, item: 'Body Wash', status: 'In Stock', category: 'Bathroom', location: 'Shower', minQty: '1', currentQty: '1' }
    ],
    wishlist: [
      { id: 1, item: 'Royal Enfield Riding Gloves (Kevlar)', price: '₹2,800', priority: 'high', link: 'https://store.royalenfield.com' },
      { id: 2, item: 'Whey Protein Isolate 2kg (Double Rich Choc)', price: '₹5,400', priority: 'high', link: '' },
      { id: 3, item: 'Mechanical Keyboard (Hot-swappable)', price: '₹4,500', priority: 'medium', link: '' },
      { id: 4, item: 'Pressure Washer Foam Cannon Nozzle', price: '₹1,200', priority: 'medium', link: '' }
    ]
  },

  relationships: [
    {
      id: 1,
      name: 'Maa',
      howIKnow: 'Mother / Family · My biggest pillar & love',
      phone: '+91 98765 43210',
      whatsapp: '919876543210',
      instagram: '',
      cadence: 'Daily evening call (20:30 - 21:00)',
      birthday: 'October 24',
      lastContact: 'Today 20:30',
      notes: 'Daily evening call with Papa. Talk about college, gym, food, and daily progress.',
      emoji: '❤️',
      color: '#f43f5e'
    },
    {
      id: 2,
      name: 'Papa',
      howIKnow: 'Father / Family · Core Guide & Strength',
      phone: '+91 98765 43211',
      whatsapp: '919876543211',
      instagram: '',
      cadence: 'Daily evening call (20:30 - 21:00)',
      birthday: 'April 12',
      lastContact: 'Today 20:30',
      notes: 'Daily family check-in together with Maa at 20:30 IST.',
      emoji: '👨',
      color: '#3cd7ff'
    },
    {
      id: 3,
      name: 'NSS Core Committee',
      howIKnow: 'National Service Scheme · College Unit Leadership',
      phone: '+91 98220 11223',
      whatsapp: '919822011223',
      instagram: 'nss_college_unit',
      cadence: 'Weekly Meetings & Drives',
      birthday: 'September 24 (NSS Day)',
      lastContact: 'Yesterday',
      notes: 'Blood donation camp logistics, youth leadership meetings, village literacy campaign.',
      emoji: '🤝',
      color: '#f59e0b'
    },
    {
      id: 4,
      name: 'Rohan Sharma',
      howIKnow: 'Gym Training Partner & Heavy Lifting Buddy',
      phone: '+91 98234 56789',
      whatsapp: '919823456789',
      instagram: 'rohan_lifts',
      cadence: '6x / week (Daily at Gym)',
      birthday: 'December 5',
      lastContact: 'Today at Gym',
      notes: 'Spotter on Bench Press & Squats. Following the exact 6-day Push/Pull/Legs split together.',
      emoji: '🏋️‍♂️',
      color: '#00d4ff'
    },
    {
      id: 5,
      name: 'Vikram Sir',
      howIKnow: 'Tech & Career Mentor · Staff Engineer at Google',
      phone: '+91 97123 45678',
      whatsapp: '919712345678',
      instagram: 'vikram.tech',
      cadence: 'Monthly Sync',
      birthday: 'August 14',
      lastContact: '10 days ago',
      notes: 'Quarterly career roadmapping and code architecture review.',
      emoji: '👨‍💼',
      color: '#a855f7'
    },
    {
      id: 6,
      name: 'Priya Singh',
      howIKnow: 'College CS Batchmate & AI / SE Project Partner',
      phone: '+91 96543 21098',
      whatsapp: '919654321098',
      instagram: 'priya_codes',
      cadence: 'Weekly / As needed for assignments',
      birthday: 'June 18',
      lastContact: 'Yesterday',
      notes: 'Collaborating on Artificial Intelligence lab and Software Engineering sprint deliverables.',
      emoji: '👩‍💻',
      color: '#6af7ba'
    }
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
    make: 'Royal Enfield',
    model: 'Classic 350',
    year: 2023,
    color: 'Stealth Black / Halcyon',
    plate: 'MH12-RE-3500',
    engine: '349cc J-Series Air-Oil Cooled SOHC Single Cylinder',
    fuel: 72,
    fuelCapacityLiters: 13.5,
    estimatedMileageKmpl: 36,
    odometer: 8420,
    lastWashDate: '2026-09-18',
    washIntervalDays: 15,
    lastChainLubeOdo: 8200,
    nextServiceOdo: 10000,
    engineOil: 'Motul 15W-50 Semi-Synthetic',
    tyrePressure: { front: 32, rear: 36, unit: 'PSI' },
    insurance: { expiry: '2027-04-15', provider: 'ICICI Lombard' },
    puc: { expiry: '2026-12-30' },
    washHistory: [
      { date: '2026-09-18', type: 'Pressure Wash + Chain Degrease & Motul Lube', cost: 350 },
      { date: '2026-09-03', type: 'Home Foam Pressure Wash + Chrome Polish', cost: 0 },
      { date: '2026-08-19', type: 'Full Service Wash & Chain Tightening', cost: 450 }
    ],
    leaveRideReminders: [
      {
        ride: 'Lonavala & Tiger Point Monsoon/Winter Ride',
        distance: '140 km roundtrip',
        plannedDate: '2026-10-10',
        leaveAlert: 'Apply for 1 Day Casual Leave (Friday) to get a 3-day riding window!',
        status: 'Planned'
      },
      {
        ride: 'Goa Coastal Bike Tour (Enfield Riders Meet)',
        distance: '580 km',
        plannedDate: '2026-11-20',
        leaveAlert: 'Apply for 3 Days Leave (Thurs-Mon) in advance for the long expedition.',
        status: 'Upcoming'
      }
    ],
    fuelLogs: [
      { date: '2026-09-24', liters: 10.2, amount: 1100, odometer: 8380, mileageKmpl: 36.5 },
      { date: '2026-09-10', liters: 9.5, amount: 1020, odometer: 8010, mileageKmpl: 35.8 }
    ]
  },

  travel: {
    trips: [
      {
        id: 1,
        dest: 'Goa Coastal Retreat',
        dates: 'October 18 - 23, 2026',
        status: 'planned',
        totalBudget: 35000,
        savedFromFinance: 22000,
        spent: 2500,
        emoji: '🏖️',
        notes: 'Connected to Finance Savings Pool. Need ₹13,000 more to hit 100% budget!',
        budgetBreakdown: [
          { category: 'Stay & Beach Resort', allocated: 14000, paid: 0, status: 'Shortlisted' },
          { category: 'Bike Fuel & Travel Logistics', allocated: 7000, paid: 2500, status: 'Advance Paid' },
          { category: 'Food & Coastal Dining', allocated: 8000, paid: 0, status: 'Planned' },
          { category: 'Water Sports & Buffer', allocated: 6000, paid: 0, status: 'Planned' }
        ],
        itinerary: [
          { day: 'Day 1', items: [{ time: '06:00', event: 'Early morning Royal Enfield ride start' }, { time: '14:00', event: 'Check-in at Vagator Beach resort' }, { time: '18:00', event: 'Sunset coffee & chill' }] },
          { day: 'Day 2', items: [{ time: '09:00', event: 'North Goa coastal ride (Anjuna to Morjim)' }, { time: '13:00', event: 'Authentic Goan Thali' }, { time: '20:00', event: 'Dinner by the sea' }] },
          { day: 'Day 3', items: [{ time: '10:00', event: 'Dudhsagar Waterfalls expedition' }, { time: '19:00', event: 'Night flea market & live acoustic music' }] }
        ],
        packing: [
          { item: 'Beachwear & Towel', done: true },
          { item: 'MacBook & Type-C GaN Charger', done: true },
          { item: 'Royal Enfield Riding Jacket & Gloves', done: true },
          { item: 'Driving License & Bike RC / Insurance', done: true },
          { item: 'Sunscreen SPF 50 & Polarized Sunglasses', done: false },
          { item: 'GoPro Hero & Mounts for Classic 350', done: false },
          { item: 'First Aid Kit & Electrolyte Sachets', done: true }
        ]
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
    { id:1, type:'Note', title:'Python & LeetCode 150 Patterns', preview:'Focus on Sliding Window, Two Pointers, and Binary Tree DFS/BFS traversals. Use Python collections.deque and heapq for O(log k) operations...', date:'2026-11-20', tags:['coding','python','dsa'] },
    { id:2, type:'Idea', title:'TADASHI cross-domain replanning algorithm', preview:'When a major event changes, traverse Life Graph DFS, calculate constraint impact scores across Academics, Fitness, and Routines...', date:'2026-11-18', tags:['project','ai'] },
    { id:3, type:'Book Note', title:'Atomic Habits — Key Takeaways', preview:'1% better every day compounds to 37x in a year. Focus on systems not goals. Make habits obvious, attractive...', date:'2026-11-10', tags:['books','habits'] },
    { id:4, type:'Journal', title:'Weekly reflection & Semester Priorities', preview:'Solid momentum this week. Bench Press hit 82.5kg. AI heuristic search lab on track. LeetCode Python 150 at 48 problems. Need to finalize NSS blood donation roster before Friday and keep daily 20:30 call with Maa & Papa...', date:'2026-11-24', tags:['journal','reflection'] },
    { id:5, type:'Project Idea', title:'Expert Systems Rule Engine in Python', preview:'Building a forward-chaining rule engine in Python for autonomous student diagnostic recommendations...', date:'2026-11-15', tags:['idea','ai','expert-systems'] },
  ],

  routines: {
    morning: [
      { task:'Wake up & hydrate (500ml warm water)', time:'06:30', done:true },
      { task:'Gym — Push Day (Chest & Triceps)', time:'07:00', done:true },
      { task:'Post-workout shower & grooming', time:'08:15', done:false },
      { task:'High-protein breakfast (Oats & Eggs / Whey)', time:'08:30', done:false },
      { task:'Review daily agenda & lecture prep', time:'09:15', done:false },
    ],
    night: [
      { task:'Call Maa & Papa (Daily Family Check-in)', time:'20:30', done:false },
      { task:'Balanced dinner & 180g protein check', time:'21:00', done:false },
      { task:'Review LeetCode streak & NSS tasks', time:'22:00', done:false },
      { task:'Stop screen 30 min before bed', time:'22:30', done:false },
      { task:'Journal / daily reflection', time:'22:45', done:false },
      { task:'Sleep & recovery (7.5h target)', time:'23:00', done:false },
    ],
    sleep: { target:'23:00', wake:'06:30', lastNight: 7.2 }
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

  updates: {
    systemVersion: '5.9.0',
    currentBuild: '0ae6137',
    lastCheckedAt: '2026-11-15T12:00:00.000Z',
    history: [
      {
        id: 'upd_v5_8_0',
        version: '5.8.0',
        timestamp: '2026-11-15T11:45:00.000Z',
        description: 'Dual-Gateway AI router (OmniRoute + FreeLLMAPI) & Vercel serverless integration',
        author: 'Antigravity / DeepMind',
        filesCount: 15,
        status: 'applied'
      },
      {
        id: 'upd_v5_9_0',
        version: '5.9.0',
        timestamp: '2026-11-15T12:15:00.000Z',
        description: 'Update Center Live Hot-Patching Engine & OTA Manifest Manager',
        author: 'Krishna Singh',
        filesCount: 4,
        status: 'applied'
      }
    ]
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

if (typeof window !== 'undefined') {
  window.DATA = DATA;
}

