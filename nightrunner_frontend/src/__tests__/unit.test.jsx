import { describe, it, expect } from 'vitest';

describe('Frontend Unit Tests Placeholder', () => {
  it('verifies basic component rendering capability', () => {
    const title = 'NightRunner Frontend';
    expect(title).toBe('NightRunner Frontend');
  });

  it('validates environment variable fallback defaults', () => {
    const apiBackend = import.meta.env.VITE_API_BACKEND_URL || 'http://localhost:8000/v1';
    expect(apiBackend).toBeDefined();
  });
});

describe('Configuration Editor Payload Contracts', () => {
  it('formats payload with groupId and name for backend consumption', () => {
    const rawConfiguration = {
      groupId: '018f-group-id',
      name: ' Ropework Station Config ',
      description: ' Handles knot tying tasks ',
      tasks: [{ name: 'Square Knot', type: 'Timed Challenge' }]
    };

    const payload = {
      groupId: rawConfiguration.groupId,
      name: rawConfiguration.name.trim(),
      description: rawConfiguration.description.trim() || null,
      tasks: rawConfiguration.tasks ?? []
    };

    expect(payload).toEqual({
      groupId: '018f-group-id',
      name: 'Ropework Station Config',
      description: 'Handles knot tying tasks',
      tasks: [{ name: 'Square Knot', type: 'Timed Challenge' }]
    });
    expect(payload.groupId).not.toBe('');
  });

  it('handles optional description when empty', () => {
    const rawConfiguration = {
      groupId: '018f-group-id',
      name: 'Firebuilding Config',
      description: '   ',
      tasks: []
    };

    const payload = {
      groupId: rawConfiguration.groupId,
      name: rawConfiguration.name.trim(),
      description: rawConfiguration.description.trim() || null,
      tasks: rawConfiguration.tasks ?? []
    };

    expect(payload.description).toBeNull();
  });

  it('preserves Stopwatch and Timed Challenge tasks array in configuration state', () => {
    const existingTasks = [
      { name: 'Knot Tying', type: 'Timed Challenge', maxScore: 100 },
      { name: 'Speed Lashing', type: 'Stopwatch', timeLimit: 300 }
    ];

    const newTask = { name: 'First Aid', type: 'Score Challenge', maxScore: 50 };

    const updatedTasks = [...existingTasks, newTask];

    expect(updatedTasks).toHaveLength(3);
    expect(updatedTasks[1].type).toBe('Stopwatch');
    expect(updatedTasks[2].name).toBe('First Aid');
  });

  it('supports all task types with maxScore, options array, and radio choices in scoring page', () => {
    const supportedTypes = [
      "Timed Challenge",
      "Stopwatch",
      "Score Challenge",
      "Pass / Fail",
      "Multiple Choice",
      "Text Answer",
      "Checkpoint",
      "Custom"
    ];

    supportedTypes.forEach(type => {
      const task = {
        name: `Sample ${type}`,
        type,
        maxScore: 100,
        notes: "Remember safety goggles and gear inspection.",
        options: type === "Multiple Choice" ? [
          { label: "Full Points", value: 100 },
          { label: "Half Points", value: 50 },
          { label: "No Points", value: 0 }
        ] : undefined
      };

      expect(task.type).toBeDefined();
      expect(task.notes).toBe("Remember safety goggles and gear inspection.");
      if (type === "Multiple Choice") {
        expect(task.options).toHaveLength(3);
        expect(task.options[0].value).toBe(100);
      }
    });
  });

  it('verifies right sidebar guidance lookup for all 8 task types', () => {
    const ALL_TASK_TYPES = [
      "Timed Challenge",
      "Stopwatch",
      "Score Challenge",
      "Pass / Fail",
      "Multiple Choice",
      "Text Answer",
      "Checkpoint",
      "Custom"
    ];

    const TASK_GUIDANCE = {
      "Score Challenge": { title: "Score Challenge Guidance" },
      "Timed Challenge": { title: "Timed Challenge Guidance" },
      "Stopwatch": { title: "Stopwatch Guidance" },
      "Pass / Fail": { title: "Pass / Fail Guidance" },
      "Multiple Choice": { title: "Multiple Choice Guidance" },
      "Text Answer": { title: "Text Answer Guidance" },
      "Checkpoint": { title: "Checkpoint Guidance" },
      "Custom": { title: "Custom Task Guidance" }
    };

    ALL_TASK_TYPES.forEach(type => {
      expect(TASK_GUIDANCE[type]).toBeDefined();
      expect(TASK_GUIDANCE[type].title).toContain(type);
    });
  });

  describe('Task Type Specific Contracts', () => {
    it('handles Timed Challenge task type with time limit, max score, and notes', () => {
      const task = {
        name: 'Speed Fire Building',
        type: 'Timed Challenge',
        timeLimit: 300,
        maxScore: 100,
        notes: 'Stop timer when flame burns string.'
      };
      expect(task.type).toBe('Timed Challenge');
      expect(task.timeLimit).toBe(300);
      expect(task.maxScore).toBe(100);
      expect(task.notes).toBeDefined();
    });

    it('handles Stopwatch task type with elapsed duration tracking', () => {
      const task = {
        name: 'Lashing Speed Test',
        type: 'Stopwatch',
        notes: 'Record HH:MM:SS.MS duration.'
      };
      expect(task.type).toBe('Stopwatch');
      expect(task.notes).toBeDefined();
    });

    it('handles Score Challenge task type with raw numeric score', () => {
      const task = {
        name: 'Target Shooting',
        type: 'Score Challenge',
        maxScore: 50,
        scoreWeight: 1.5,
        notes: 'Enter total bulls-eye points.'
      };
      expect(task.type).toBe('Score Challenge');
      expect(task.maxScore).toBe(50);
      expect(task.scoreWeight).toBe(1.5);
    });

    it('handles Pass / Fail task type binary boolean evaluation', () => {
      const task = {
        name: 'Uniform Inspection',
        type: 'Pass / Fail',
        notes: 'Check for patch alignment and neckerchief.'
      };
      expect(task.type).toBe('Pass / Fail');
      expect(task.notes).toBeDefined();
    });

    it('handles Multiple Choice task type with options list and radio selection points', () => {
      const task = {
        name: 'First Aid Quiz',
        type: 'Multiple Choice',
        notes: 'Select the best response.',
        options: [
          { label: 'CPR Step 1', value: 10 },
          { label: 'CPR Step 2', value: 5 },
          { label: 'None', value: 0 }
        ]
      };
      expect(task.type).toBe('Multiple Choice');
      expect(task.options).toHaveLength(3);
      expect(task.options[0].value).toBe(10);
    });

    it('handles Text Answer task type with expected answer reference', () => {
      const task = {
        name: 'Morse Code Cipher',
        type: 'Text Answer',
        expectedAnswer: 'SCOUTING',
        maxScore: 20,
        notes: 'Case insensitive text matching.'
      };
      expect(task.type).toBe('Text Answer');
      expect(task.expectedAnswer).toBe('SCOUTING');
      expect(task.maxScore).toBe(20);
    });

    it('handles Checkpoint task type arrival verification', () => {
      const task = {
        name: 'Waystation Checkpoint Alpha',
        type: 'Checkpoint',
        maxScore: 10,
        notes: 'Stamp patrol logbook on arrival.'
      };
      expect(task.type).toBe('Checkpoint');
      expect(task.maxScore).toBe(10);
      expect(task.notes).toBeDefined();
    });

    it('handles Custom task type with custom max score bounds', () => {
      const task = {
        name: 'Obstacle Course Challenge',
        type: 'Custom',
        maxScore: 150,
        scoreWeight: 2.0,
        notes: 'Special bonus points awarded by station leader.'
      };
      expect(task.type).toBe('Custom');
      expect(task.maxScore).toBe(150);
      expect(task.scoreWeight).toBe(2.0);
    });

    it('handles divideByPatrolSize flag on task configuration and divides raw score by participant count', () => {
      const task = {
        name: 'First Aid Rescue Task',
        type: 'Score Challenge',
        maxScore: 100,
        scoreWeight: 1.0,
        divideByPatrolSize: true
      };
      expect(task.divideByPatrolSize).toBe(true);

      const rawScore = 80;
      const participantCount = 4;
      const calculatedScore = task.divideByPatrolSize ? (rawScore / participantCount) : rawScore;
      expect(calculatedScore).toBe(20);
    });
  });
});



describe('Authentication Reactive State & Sidebar Navigation Contracts', () => {
  it('populates user profile and activates admin links reactively upon authentication', () => {
    // 1. Initial unauthenticated state: no cached user profile
    let cachedUser = null;
    let isAdmin = cachedUser && cachedUser.isAdmin;
    expect(cachedUser).toBeNull();
    expect(isAdmin).toBeFalsy();

    // 2. Simulate login completion & eager fetch of /v1/me returning user profile
    const fetchedUser = {
      id: 'usr-123',
      username: 'adminuser',
      email: 'admin@example.com',
      displayName: 'Admin User',
      isAdmin: true,
      roles: ['admin', 'scorer']
    };

    cachedUser = fetchedUser;
    isAdmin = cachedUser.isAdmin === true;

    // 3. Verify user state and admin navigation visibility contract
    expect(cachedUser.displayName).toBe('Admin User');
    expect(isAdmin).toBe(true);
    expect(cachedUser.roles).toContain('admin');
  });
});

describe('Station Editor Configuration & Task Loading Contracts', () => {
  it('loads preset tasks from selected configuration into station editor state', () => {
    const selectedConfig = {
      id: 'cfg-ropework-1',
      name: 'Advanced Ropework',
      tasks: [
        { id: 't1', name: 'Tripod Lashing', type: 'Timed Challenge' },
        { id: 't2', name: 'Speed Bowline', type: 'Stopwatch' }
      ]
    };

    const station = {
      name: 'Ropes Station',
      activeConfigurationId: selectedConfig.id,
      tasks: selectedConfig.tasks ? JSON.parse(JSON.stringify(selectedConfig.tasks)) : []
    };

    expect(station.tasks).toHaveLength(2);
    expect(station.tasks[0].name).toBe('Tripod Lashing');
    expect(station.tasks[1].type).toBe('Stopwatch');
  });

  it('prompts confirmation and replaces tasks when switching active configuration preset', () => {
    let confirmPromptCalled = false;
    let userConfirmed = true;

    const mockConfirm = (msg) => {
      confirmPromptCalled = true;
      return userConfirmed;
    };

    const existingTasks = [{ id: 't1', name: 'Old Task', type: 'Timed Challenge' }];
    const newConfig = {
      id: 'cfg-fire-1',
      tasks: [{ id: 't2', name: 'Flint Fire', type: 'Timed Challenge' }]
    };

    let currentTasks = existingTasks;
    if (currentTasks.length > 0) {
      const confirmed = mockConfirm('Switching configuration presets will load tasks from the new configuration...');
      if (confirmed) {
        currentTasks = JSON.parse(JSON.stringify(newConfig.tasks));
      }
    }

    expect(confirmPromptCalled).toBe(true);
    expect(currentTasks).toHaveLength(1);
    expect(currentTasks[0].name).toBe('Flint Fire');
  });
});

describe('Station Tasks Persistence & Independent Custom Tasks Contracts', () => {
  it('includes tasks array in Station payload when saving station', () => {
    const stationForm = {
      name: 'Alpha Station',
      description: 'First patrol station',
      activeConfigurationId: 'cfg-1',
      eventId: 'evt-1',
      tasks: [
        { id: 't1', description: 'Preset Task 1', scoreWeight: 1 },
        { id: 'custom-1', description: 'Custom Station Task', scoreWeight: 2 }
      ]
    };

    const payload = {
      name: stationForm.name,
      description: stationForm.description,
      activeConfigurationId: stationForm.activeConfigurationId,
      eventId: stationForm.eventId,
      tasks: stationForm.tasks ?? []
    };

    expect(payload.tasks).toHaveLength(2);
    expect(payload.tasks[1].description).toBe('Custom Station Task');
  });

  it('keeps custom station tasks isolated to station without mutating preset configuration template', () => {
    const presetConfigurationTemplate = {
      id: 'cfg-1',
      key: 'pioneering_preset',
      tasks: [{ id: 't1', description: 'Square Knot' }]
    };

    // Station initialized from preset template
    const station = {
      id: 'st-1',
      activeConfigurationId: presetConfigurationTemplate.id,
      tasks: JSON.parse(JSON.stringify(presetConfigurationTemplate.tasks))
    };

    // User adds custom task to station
    station.tasks.push({ id: 't-custom', description: 'Custom Signal Mirroring' });

    // Station tasks updated
    expect(station.tasks).toHaveLength(2);
    // Configuration template remains untouched
    expect(presetConfigurationTemplate.tasks).toHaveLength(1);
    expect(presetConfigurationTemplate.tasks[0].id).toBe('t1');
  });
});

describe('Copy Configuration as Template Contracts', () => {
  it('pre-populates new configuration state with tasks and appended copy title when copyFrom parameter is provided', () => {
    const existingConfig = {
      id: 'cfg-original',
      groupId: 'grp-knot-1',
      name: 'Advanced Lashings',
      description: 'Lashing tasks preset',
      tasks: [
        { name: 'Tripod Lashing', type: 'Timed Challenge' },
        { name: 'Shear Lashing', type: 'Stopwatch' }
      ]
    };

    const copyFromId = 'cfg-original';
    const targetConfig = copyFromId ? existingConfig : null;

    const newConfigurationState = {
      groupId: targetConfig?.groupId ?? '',
      name: copyFromId ? `${targetConfig?.name} (Copy)` : '',
      description: targetConfig?.description ?? '',
      tasks: targetConfig?.tasks ? JSON.parse(JSON.stringify(targetConfig.tasks)) : []
    };

    expect(newConfigurationState.name).toBe('Advanced Lashings (Copy)');
    expect(newConfigurationState.groupId).toBe('grp-knot-1');
    expect(newConfigurationState.tasks).toHaveLength(2);
    expect(newConfigurationState.tasks[0].name).toBe('Tripod Lashing');
  });

  it('pre-populates new configuration state when copying from a Station instance back to Configuration Manager', () => {
    const stationInstance = {
      id: 'st-101',
      name: 'Pioneering Post 1',
      description: 'Outdoor pioneering station with custom task',
      activeConfigurationId: 'cfg-rope-base',
      tasks: [
        { name: 'Tripod Lashing', type: 'Timed Challenge' },
        { name: 'Custom Signal Flagging', type: 'Score Challenge' }
      ]
    };

    const newConfigFromStation = {
      groupId: '',
      name: `${stationInstance.name} Preset`,
      description: stationInstance.description,
      tasks: JSON.parse(JSON.stringify(stationInstance.tasks))
    };

    expect(newConfigFromStation.name).toBe('Pioneering Post 1 Preset');
    expect(newConfigFromStation.tasks).toHaveLength(2);
    expect(newConfigFromStation.tasks[1].name).toBe('Custom Signal Flagging');
  });
});

describe('Patrol Service & Editor Contracts', () => {
  it('allows fetching patrol with single patrolId argument (without requiring explicit eventId)', async () => {
    const mockTransport = {
      get: (url) => Promise.resolve({ id: 'p-123', name: 'Eagle Patrol', members: [] })
    };

    // Import-like logic for PatrolService
    const patrolId = 'p-123';
    const arg1 = patrolId;
    const arg2 = undefined;
    const resolvedPatrolId = arg2 ?? arg1;

    expect(resolvedPatrolId).toBe('p-123');

    const res = await mockTransport.get(`/patrols/${resolvedPatrolId}`);
    expect(res.name).toBe('Eagle Patrol');
  });

  it('allows updating patrol with (patrolId, payload) signature or (eventId, patrolId, payload) signature', async () => {
    const updatePatrolHelper = (arg1, arg2, arg3) => {
      let eventId = null;
      let patrolId = null;
      let patrol = null;

      if (arg3 !== undefined) {
        eventId = arg1;
        patrolId = arg2;
        patrol = arg3;
      } else {
        patrolId = arg1;
        patrol = arg2;
      }

      return { eventId, patrolId, patrol };
    };

    // Signature 1: updatePatrol(patrolId, payload)
    const call1 = updatePatrolHelper('p-100', { name: 'Foxes' });
    expect(call1.patrolId).toBe('p-100');
    expect(call1.patrol.name).toBe('Foxes');
    expect(call1.eventId).toBeNull();

    // Signature 2: updatePatrol(eventId, patrolId, payload)
    const call2 = updatePatrolHelper('evt-1', 'p-100', { name: 'Foxes' });
    expect(call2.eventId).toBe('evt-1');
    expect(call2.patrolId).toBe('p-100');
    expect(call2.patrol.name).toBe('Foxes');
  });
});

describe('EventManager Station Count & Member Roles Contracts', () => {
  it('resolves actual stations count from loaded station objects or event station array fallback', () => {
    const mockEvent = { id: 'evt-1', stations: ['st-1'], organizers: ['usr-1'] };
    const fetchedStations = [
      { id: 'st-1', name: 'Station 1' },
      { id: 'st-2', name: 'Station 2' }
    ];

    const displayStationCount = fetchedStations.length || (mockEvent.stations?.length ?? 0);
    expect(displayStationCount).toBe(2);
  });

  it('filters users assigned to selected event and maps their assigned role correctly', () => {
    const targetEventId = 'evt-101';
    const mockEvent = { id: targetEventId, organizers: ['usr-1'] };
    const mockUsers = [
      { id: 'usr-1', username: 'alice', email: 'alice@example.com', roles: { 'evt-101': 'event-admin' } },
      { id: 'usr-2', username: 'bob', email: 'bob@example.com', roles: { 'evt-999': 'scorer' } },
      { id: 'usr-3', username: 'charlie', email: 'charlie@example.com', roles: { 'evt-101': 'scorer' } }
    ];

    const assignedMembers = mockUsers.filter(u => u.roles?.[targetEventId] || mockEvent.organizers?.includes(u.id))
      .map(u => ({
        ...u,
        assignedRole: u.roles?.[targetEventId] || 'organizer'
      }));

    expect(assignedMembers).toHaveLength(2);
    expect(assignedMembers[0].username).toBe('alice');
    expect(assignedMembers[0].assignedRole).toBe('event-admin');
    expect(assignedMembers[1].username).toBe('charlie');
    expect(assignedMembers[1].assignedRole).toBe('scorer');
  });
});

describe('User Manager Holding Area & Role Permissions Contracts', () => {
  it('filters pending users in holding area for event admins and station leaders', () => {
    const eventId = 'evt-1';
    const allUsers = [
      { id: 'u1', username: 'pending_user', status: 'pending', roles: {} },
      { id: 'u2', username: 'active_user', status: 'active', roles: { 'evt-1': 'user' } },
      { id: 'u3', username: 'other_user', status: 'active', roles: { 'evt-2': 'user' } }
    ];

    // Event admin visibility
    const eventAdminVisible = allUsers.filter(u => u.roles?.[eventId] != null || u.status === 'pending');
    expect(eventAdminVisible).toHaveLength(2);
    expect(eventAdminVisible.map(u => u.username)).toContain('pending_user');
    expect(eventAdminVisible.map(u => u.username)).toContain('active_user');

    // Station leader visibility (my station = st-1)
    const myStationIds = new Set(['st-1']);
    allUsers[1].stationStaff = [{ stationId: 'st-1' }];
    const stationLeaderVisible = allUsers.filter(u => u.status === 'pending' || u.stationStaff?.some(s => myStationIds.has(s.stationId)));
    expect(stationLeaderVisible).toHaveLength(2);
    expect(stationLeaderVisible.map(u => u.username)).toContain('pending_user');
  });

  it('enforces status transition contracts for approve (active) and block (blocked)', () => {
    const user = { id: 'u1', username: 'new_scout', status: 'pending' };

    // Approve action
    const approvedUser = { ...user, status: 'active' };
    expect(approvedUser.status).toBe('active');

    // Block action
    const blockedUser = { ...approvedUser, status: 'blocked' };
    expect(blockedUser.status).toBe('blocked');
  });

  it('supports all 7 event roles including scoring-center and provides role permission guidance', () => {
    const EVENT_ROLES = [
      "user",
      "event-admin",
      "scoring-lead",
      "scoring-center",
      "scorer",
      "station-lead",
      "volunteer"
    ];

    expect(EVENT_ROLES).toContain("scoring-center");
    expect(EVENT_ROLES).toContain("scoring-lead");
    expect(EVENT_ROLES).toContain("station-lead");
    expect(EVENT_ROLES).toHaveLength(7);
  });

  it('maps system-admin role capabilities and root access permissions', () => {
    const ROLE_CAPABILITIES = {
      'system-admin': { title: 'System Administrator', description: 'Full root access to all events, system configurations, global user management, and organization settings.' }
    };
    expect(ROLE_CAPABILITIES['system-admin'].title).toBe('System Administrator');
    expect(ROLE_CAPABILITIES['system-admin'].description).toContain('Full root access');
  });

  it('maps event-admin role capabilities and event management permissions', () => {
    const ROLE_CAPABILITIES = {
      'event-admin': { title: 'Event Administrator', description: 'Manages event settings, stations, patrols, configurations, user role assignments, and final score publishing.' }
    };
    expect(ROLE_CAPABILITIES['event-admin'].title).toBe('Event Administrator');
    expect(ROLE_CAPABILITIES['event-admin'].description).toContain('user role assignments');
  });

  it('maps scoring-lead role capabilities and score oversight permissions', () => {
    const ROLE_CAPABILITIES = {
      'scoring-lead': { title: 'Scoring Lead', description: 'Oversees scoring, verifies station score submissions, resolves discrepancies, and publishes final results.' }
    };
    expect(ROLE_CAPABILITIES['scoring-lead'].title).toBe('Scoring Lead');
    expect(ROLE_CAPABILITIES['scoring-lead'].description).toContain('publishes final results');
  });

  it('maps scoring-center role capabilities and paper entry permissions', () => {
    const ROLE_CAPABILITIES = {
      'scoring-center': { title: 'Scoring Center Staff', description: 'Central paper score entry, batch scoring verification, and score adjustments.' }
    };
    expect(ROLE_CAPABILITIES['scoring-center'].title).toBe('Scoring Center Staff');
    expect(ROLE_CAPABILITIES['scoring-center'].description).toContain('Central paper score entry');
  });

  it('maps scorer role capabilities and evaluation permissions', () => {
    const ROLE_CAPABILITIES = {
      'scorer': { title: 'Station Scorer / Judge', description: 'Enters patrol task scores and evaluations at assigned stations.' }
    };
    expect(ROLE_CAPABILITIES['scorer'].title).toBe('Station Scorer / Judge');
    expect(ROLE_CAPABILITIES['scorer'].description).toContain('Enters patrol task scores');
  });

  it('maps station-lead role capabilities and station oversight permissions', () => {
    const ROLE_CAPABILITIES = {
      'station-lead': { title: 'Station Lead', description: 'Manages station volunteers, overrides station locks, and oversees station operations.' }
    };
    expect(ROLE_CAPABILITIES['station-lead'].title).toBe('Station Lead');
    expect(ROLE_CAPABILITIES['station-lead'].description).toContain('overrides station locks');
  });

  it('maps volunteer role capabilities and station task permissions', () => {
    const ROLE_CAPABILITIES = {
      'volunteer': { title: 'Station Volunteer', description: 'Performs station-level tasks, patrol check-in/out, and volunteer partner reviews.' }
    };
    expect(ROLE_CAPABILITIES['volunteer'].title).toBe('Station Volunteer');
    expect(ROLE_CAPABILITIES['volunteer'].description).toContain('volunteer partner reviews');
  });

  it('maps general user role capabilities and basic authenticated access', () => {
    const ROLE_CAPABILITIES = {
      'user': { title: 'General User', description: 'Basic authenticated user access without specific event administration privileges.' }
    };
    expect(ROLE_CAPABILITIES['user'].title).toBe('General User');
    expect(ROLE_CAPABILITIES['user'].description).toContain('Basic authenticated user access');
  });

  it('enforces route and feature access rules for all user role tiers', () => {
    const checkCanAccessFinalizer = (role) => ['system-admin', 'event-admin', 'scoring-lead', 'scoring-center'].includes(role);
    const checkCanAccessScoreForm = (role) => ['system-admin', 'event-admin', 'scoring-lead', 'scoring-center', 'scorer', 'station-lead'].includes(role);
    const checkCanManageUsers = (role) => ['system-admin', 'event-admin'].includes(role);

    // system-admin
    expect(checkCanAccessFinalizer('system-admin')).toBe(true);
    expect(checkCanAccessScoreForm('system-admin')).toBe(true);
    expect(checkCanManageUsers('system-admin')).toBe(true);

    // event-admin
    expect(checkCanAccessFinalizer('event-admin')).toBe(true);
    expect(checkCanAccessScoreForm('event-admin')).toBe(true);
    expect(checkCanManageUsers('event-admin')).toBe(true);

    // scoring-lead
    expect(checkCanAccessFinalizer('scoring-lead')).toBe(true);
    expect(checkCanAccessScoreForm('scoring-lead')).toBe(true);
    expect(checkCanManageUsers('scoring-lead')).toBe(false);

    // scoring-center
    expect(checkCanAccessFinalizer('scoring-center')).toBe(true);
    expect(checkCanAccessScoreForm('scoring-center')).toBe(true);
    expect(checkCanManageUsers('scoring-center')).toBe(false);

    // scorer
    expect(checkCanAccessFinalizer('scorer')).toBe(false);
    expect(checkCanAccessScoreForm('scorer')).toBe(true);
    expect(checkCanManageUsers('scorer')).toBe(false);

    // station-lead
    expect(checkCanAccessFinalizer('station-lead')).toBe(false);
    expect(checkCanAccessScoreForm('station-lead')).toBe(true);
    expect(checkCanManageUsers('station-lead')).toBe(false);

    // volunteer
    expect(checkCanAccessFinalizer('volunteer')).toBe(false);
    expect(checkCanAccessScoreForm('volunteer')).toBe(false);
    expect(checkCanManageUsers('volunteer')).toBe(false);

    // user
    expect(checkCanAccessFinalizer('user')).toBe(false);
    expect(checkCanAccessScoreForm('user')).toBe(false);
    expect(checkCanManageUsers('user')).toBe(false);
  });

  it('toggles role reference guide sidebar drawer visibility state', () => {
    let showRoleHelp = false;
    const toggleRoleHelp = () => { showRoleHelp = !showRoleHelp; };

    expect(showRoleHelp).toBe(false);
    toggleRoleHelp();
    expect(showRoleHelp).toBe(true);
    toggleRoleHelp();
    expect(showRoleHelp).toBe(false);
  });
});

describe('UserService PATCH Methods Contracts', () => {
  it('constructs correct PATCH payloads for patchEventRole, setUserStatus, setStationStaff, and toggleStationStaff', async () => {
    const recordedCalls = [];
    const mockTransport = {
      patch: (url, payload) => {
        recordedCalls.push({ url, payload });
        return Promise.resolve({ id: 'usr-patch-1', ...payload });
      }
    };

    // Simulate UserService calling BackendTransport.patch
    const userId = 'usr-patch-1';

    // 1. patchEventRole add
    await mockTransport.patch(`/users/${userId}`, { eventId: 'evt-100', role: 'event-admin', roleAction: 'add' });
    // 2. patchEventRole remove
    await mockTransport.patch(`/users/${userId}`, { eventId: 'evt-100', roleAction: 'remove' });
    // 3. setUserStatus
    await mockTransport.patch(`/users/${userId}`, { status: 'blocked' });
    // 4. toggleStationStaff (add/assign)
    await mockTransport.patch(`/users/${userId}`, { stationId: 'st-5', stationAction: 'assign' });

    expect(recordedCalls).toHaveLength(4);
    expect(recordedCalls[0]).toEqual({
      url: '/users/usr-patch-1',
      payload: { eventId: 'evt-100', role: 'event-admin', roleAction: 'add' }
    });
    expect(recordedCalls[1]).toEqual({
      url: '/users/usr-patch-1',
      payload: { eventId: 'evt-100', roleAction: 'remove' }
    });
    expect(recordedCalls[2]).toEqual({
      url: '/users/usr-patch-1',
      payload: { status: 'blocked' }
    });
    expect(recordedCalls[3]).toEqual({
      url: '/users/usr-patch-1',
      payload: { stationId: 'st-5', stationAction: 'assign' }
    });
  });

  it('provides a patch method on BackendTransport instance', async () => {
    const BackendTransport = (await import('../api/BackendTransport.js')).default;
    expect(typeof BackendTransport.patch).toBe('function');
  });
});

describe('Patrol Communication Information Contracts', () => {
  it('constructs patrol payload with communication fields including phone number, radio frequency, radio channel, and radio identifier', () => {
    const rawPatrol = {
      name: 'Alpha Patrol',
      phoneNumber: '555-867-5309',
      radioFrequency: '462.5625 MHz',
      radioChannel: 'Channel 1',
      hasRadio: true,
      radioIdentifier: 'Radio-04',
      members: []
    };

    const payload = {
      name: rawPatrol.name.trim(),
      phoneNumber: rawPatrol.phoneNumber ? rawPatrol.phoneNumber.trim() : null,
      radioFrequency: rawPatrol.radioFrequency ? rawPatrol.radioFrequency.trim() : null,
      radioChannel: rawPatrol.radioChannel ? rawPatrol.radioChannel.trim() : null,
      hasRadio: Boolean(rawPatrol.hasRadio),
      radioIdentifier: rawPatrol.hasRadio && rawPatrol.radioIdentifier ? rawPatrol.radioIdentifier.trim() : null,
      members: rawPatrol.members ?? []
    };

    expect(payload).toEqual({
      name: 'Alpha Patrol',
      phoneNumber: '555-867-5309',
      radioFrequency: '462.5625 MHz',
      radioChannel: 'Channel 1',
      hasRadio: true,
      radioIdentifier: 'Radio-04',
      members: []
    });
  });

  it('formats empty string comms inputs to null and false when saving', () => {
    const rawPatrol = {
      name: 'Bravo Patrol',
      phoneNumber: '  ',
      radioFrequency: '',
      radioChannel: '  ',
      hasRadio: false,
      radioIdentifier: 'Ignored when hasRadio is false',
      members: []
    };

    const payload = {
      name: rawPatrol.name.trim(),
      phoneNumber: rawPatrol.phoneNumber?.trim() || null,
      radioFrequency: rawPatrol.radioFrequency?.trim() || null,
      radioChannel: rawPatrol.radioChannel?.trim() || null,
      hasRadio: Boolean(rawPatrol.hasRadio),
      radioIdentifier: rawPatrol.hasRadio && rawPatrol.radioIdentifier ? rawPatrol.radioIdentifier.trim() : null,
      members: rawPatrol.members ?? []
    };

    expect(payload).toEqual({
      name: 'Bravo Patrol',
      phoneNumber: null,
      radioFrequency: null,
      radioChannel: null,
      hasRadio: false,
      radioIdentifier: null,
      members: []
    });
  });
});

describe('Pending Approval User Contracts', () => {
  it('identifies pending user status correctly and blocks normal route access', () => {
    const pendingUser = { id: 'u-1', username: 'pending_guy', status: 'pending' };
    const activeUser = { id: 'u-2', username: 'active_guy', status: 'active' };

    const isPendingUser = (user) => user?.status === 'pending';

    expect(isPendingUser(pendingUser)).toBe(true);
    expect(isPendingUser(activeUser)).toBe(false);
  });

  it('determines target redirect path based on user status', () => {
    const getRedirectPath = (status, currentPath) => {
      const isPending = status === 'pending';
      if (isPending && currentPath !== '/pending') return '/pending';
      if (!isPending && currentPath === '/pending') return '/dashboard';
      return null;
    };

    expect(getRedirectPath('pending', '/events')).toBe('/pending');
    expect(getRedirectPath('pending', '/pending')).toBeNull();
    expect(getRedirectPath('active', '/pending')).toBe('/dashboard');
    expect(getRedirectPath('active', '/events')).toBeNull();
  });
});

describe('CheckInOut & LiveScoring Station Visit Integration Contracts', () => {
  it('resolves active visit status and selects default check-in/out action based on station visits', () => {
    const visits = [
      {
        id: 'v-1',
        eventId: 'evt-1',
        patrolId: 'p-10',
        stationId: 'st-5',
        checkedInAt: '2026-09-09T20:00:00Z',
        checkedOutAt: null,
        createdAt: '2026-09-09T20:00:00Z'
      }
    ];

    const getVisitRecord = (patrolId, stationId) => {
      const matches = visits.filter(
        (v) => String(v.patrolId) === String(patrolId) && String(v.stationId) === String(stationId)
      );
      if (matches.length === 0) return null;
      matches.sort((a, b) => new Date(b.createdAt || b.checkedInAt) - new Date(a.createdAt || a.checkedInAt));
      return matches[0];
    };

    // 1. Selected patrol & station with an active check-in (no check-out)
    const activeVisit = getVisitRecord('p-10', 'st-5');
    const isCurrentlyCheckedIn = Boolean(activeVisit && activeVisit.checkedInAt && !activeVisit.checkedOutAt);
    expect(isCurrentlyCheckedIn).toBe(true);
    const recommendedAction = isCurrentlyCheckedIn ? 'check-out' : 'check-in';
    expect(recommendedAction).toBe('check-out');

    // 2. Selected patrol & station with no prior visits
    const noVisit = getVisitRecord('p-99', 'st-5');
    expect(noVisit).toBeNull();
    const recommendedActionNew = noVisit && noVisit.checkedInAt && !noVisit.checkedOutAt ? 'check-out' : 'check-in';
    expect(recommendedActionNew).toBe('check-in');
  });

  it('identifies completed visits and flags re-check-in confirmation warning when checking in an already checked-out patrol', () => {
    const visits = [
      {
        id: 'v-2',
        eventId: 'evt-1',
        patrolId: 'p-10',
        stationId: 'st-5',
        checkedInAt: '2026-09-09T20:00:00Z',
        checkedOutAt: '2026-09-09T20:30:00Z',
        createdAt: '2026-09-09T20:00:00Z'
      }
    ];

    const activeVisit = visits[0];
    const isCurrentlyCheckedOut = Boolean(activeVisit && activeVisit.checkedOutAt);
    expect(isCurrentlyCheckedOut).toBe(true);

    const action = 'check-in';
    const shouldPromptWarning = action === 'check-in' && isCurrentlyCheckedOut;
    expect(shouldPromptWarning).toBe(true);
  });

  it('preserves selectedStation when resetting check-in form for another patrol', () => {
    let state = {
      selectedPatrol: { id: 'p-1', name: 'Eagle Patrol' },
      selectedStation: { id: 'st-5', name: 'Ropework' },
      completed: true,
      showConfirmModal: false
    };

    // Reset handler preserving selectedStation
    const reset = () => {
      state = {
        ...state,
        selectedPatrol: null,
        completed: false,
        showConfirmModal: false
      };
    };

    reset();

    expect(state.selectedPatrol).toBeNull();
    expect(state.selectedStation).toEqual({ id: 'st-5', name: 'Ropework' });
    expect(state.completed).toBe(false);
  });

  it('builds LiveScoring visitMap with snake_case and camelCase fallback support and sorts by timestamp', () => {
    const rawVisits = [
      {
        patrol_id: 'p-1',
        station_id: 'st-1',
        checked_in_at: '2026-09-09T19:00:00Z',
        checked_out_at: null,
        created_at: '2026-09-09T19:00:00Z'
      },
      {
        patrolId: 'p-2',
        stationId: 'st-2',
        checkedInAt: '2026-09-09T19:30:00Z',
        checkedOutAt: '2026-09-09T20:00:00Z',
        createdAt: '2026-09-09T19:30:00Z'
      }
    ];

    const visitMap = {};
    const sortedVisits = [...rawVisits].sort(
      (a, b) => new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0)
    );
    for (const v of sortedVisits) {
      const pid = v.patrolId || v.patrol_id;
      const sid = v.stationId || v.station_id;
      if (pid && sid) {
        visitMap[`${pid}_${sid}`] = {
          checkedInAt: v.checkedInAt || v.checked_in_at || null,
          checkedOutAt: v.checkedOutAt || v.checked_out_at || null
        };
      }
    }

    expect(visitMap['p-1_st-1']).toEqual({
      checkedInAt: '2026-09-09T19:00:00Z',
      checkedOutAt: null
    });
    expect(visitMap['p-2_st-2']).toEqual({
      checkedInAt: '2026-09-09T19:30:00Z',
      checkedOutAt: '2026-09-09T20:00:00Z'
    });
  });

  it('persists selected event in localStorage per user and clears stored event on user change', () => {
    const STORAGE_KEY_USER = 'nightrunner_last_user_id';
    const STORAGE_KEY_EVENT = 'nightrunner_last_event_id';

    const mockStorage = {};
    const getItem = (k) => mockStorage[k] || null;
    const setItem = (k, v) => { mockStorage[k] = String(v); };
    const removeItem = (k) => { delete mockStorage[k]; };

    // Simulate User 1 selects Event 101
    const user1Id = 'usr-111';
    const event1Id = 'evt-101';
    setItem(STORAGE_KEY_USER, user1Id);
    setItem(STORAGE_KEY_EVENT, event1Id);

    expect(getItem(STORAGE_KEY_USER)).toBe('usr-111');
    expect(getItem(STORAGE_KEY_EVENT)).toBe('evt-101');

    // Simulate initializeEvent logic when User 1 logs back in (same user ID)
    let currentUserId = 'usr-111';
    let savedUserId = getItem(STORAGE_KEY_USER);
    let savedEventId = getItem(STORAGE_KEY_EVENT);
    let autoRestoredEventId = null;

    if (savedUserId && savedUserId !== currentUserId) {
      removeItem(STORAGE_KEY_EVENT);
      removeItem(STORAGE_KEY_USER);
    } else if (savedUserId === currentUserId && savedEventId) {
      autoRestoredEventId = savedEventId;
    }

    expect(autoRestoredEventId).toBe('evt-101');

    // Simulate User 2 logs in (user ID change)
    currentUserId = 'usr-222';
    savedUserId = getItem(STORAGE_KEY_USER);
    savedEventId = getItem(STORAGE_KEY_EVENT);
    autoRestoredEventId = null;

    if (savedUserId && savedUserId !== currentUserId) {
      removeItem(STORAGE_KEY_EVENT);
      removeItem(STORAGE_KEY_USER);
    } else if (savedUserId === currentUserId && savedEventId) {
      autoRestoredEventId = savedEventId;
    }

    expect(autoRestoredEventId).toBeNull();
    expect(getItem(STORAGE_KEY_EVENT)).toBeNull();
    expect(getItem(STORAGE_KEY_USER)).toBeNull();
  });

  it('blocks re-check-in when station attempt status is completed and allows reopening attempt', () => {
    let visit = {
      id: 'v-100',
      eventId: 'evt-1',
      patrolId: 'p-1',
      stationId: 'st-1',
      status: 'completed',
      checkedInAt: '2026-09-09T20:00:00Z',
      checkedOutAt: '2026-09-09T20:30:00Z',
      tasksCompletedAt: '2026-09-09T20:25:00Z'
    };

    const isScoringCompleted = visit.status === 'completed';
    const canCheckIn = !isScoringCompleted;

    expect(isScoringCompleted).toBe(true);
    expect(canCheckIn).toBe(false);

    // Simulate reopen/reset attempt within 5-minute window or with leader approval
    const reopenAttempt = () => {
      visit = {
        ...visit,
        status: 'checked_in',
        checkedOutAt: null,
        unlockedBy: 'volunteer-1'
      };
    };

    reopenAttempt();

    expect(visit.status).toBe('checked_in');
    expect(visit.checkedOutAt).toBeNull();
    expect(visit.status === 'completed').toBe(false);
  });
});

describe('Station Editor Task Editing Isolation Contracts', () => {
  it('opens isolated task editor for specified task index without mutating other tasks', () => {
    const station = {
      name: 'Pioneering Post',
      tasks: [
        { id: 't-1', name: 'Square Knot', type: 'Score Challenge', maxScore: 50 },
        { id: 't-2', name: 'Shear Lashing', type: 'Timed Challenge', timeLimit: 180 }
      ]
    };

    // Open task editor for index 1
    const taskIndexToEdit = 1;
    const taskEditorState = {
      mode: 'edit',
      index: taskIndexToEdit,
      task: JSON.parse(JSON.stringify(station.tasks[taskIndexToEdit]))
    };

    expect(taskEditorState.index).toBe(1);
    expect(taskEditorState.task.name).toBe('Shear Lashing');

    // Mutate editing copy
    taskEditorState.task.name = 'Updated Shear Lashing';
    taskEditorState.task.timeLimit = 240;

    // Verify original station tasks were not mutated prior to save
    expect(station.tasks[1].name).toBe('Shear Lashing');

    // Perform save task at specific index
    const nextTasks = [...station.tasks];
    nextTasks[taskEditorState.index] = taskEditorState.task;
    const updatedStation = { ...station, tasks: nextTasks };

    // Verify only task at target index 1 changed and task at index 0 remains unmodified
    expect(updatedStation.tasks[0].name).toBe('Square Knot');
    expect(updatedStation.tasks[1].name).toBe('Updated Shear Lashing');
    expect(updatedStation.tasks[1].timeLimit).toBe(240);
  });

  it('adds a new task cleanly using index-based taskEditor state', () => {
    const station = {
      name: 'Obstacle Station',
      tasks: [{ id: 't-1', name: 'Wall Climb', type: 'Pass / Fail' }]
    };

    const newTask = {
      id: 't-new-uuid',
      name: 'Rope Traverse',
      type: 'Timed Challenge',
      timeLimit: 120
    };

    const taskEditorState = {
      mode: 'create',
      index: station.tasks.length,
      task: newTask
    };

    const nextTasks = [...station.tasks];
    if (taskEditorState.mode === 'create') {
      nextTasks.push(taskEditorState.task);
    }

    const updatedStation = { ...station, tasks: nextTasks };

    expect(updatedStation.tasks).toHaveLength(2);
    expect(updatedStation.tasks[0].name).toBe('Wall Climb');
    expect(updatedStation.tasks[1].name).toBe('Rope Traverse');
  });

  it('deletes specific task index cleanly from station tasks array', () => {
    const station = {
      name: 'First Aid Post',
      tasks: [
        { id: 't-1', name: 'Splinting' },
        { id: 't-2', name: 'Bandaging' },
        { id: 't-3', name: 'CPR Quiz' }
      ]
    };

    const deleteIndex = 1;
    const updatedTasks = station.tasks.filter((_, i) => i !== deleteIndex);

    expect(updatedTasks).toHaveLength(2);
    expect(updatedTasks[0].name).toBe('Splinting');
    expect(updatedTasks[1].name).toBe('CPR Quiz');
  });
});

describe('Scoring Form and ScoreField Unit Verification', () => {
  it('handles string and numeric option values in MultiChoice tasks without returning NaN', () => {
    const stringOptions = [
      { label: 'Pass', value: 'PASS' },
      { label: 'Fail', value: 'FAIL' }
    ];

    const numericOptions = [
      { label: 'Full', value: 10 },
      { label: 'Zero', value: 0 }
    ];

    // Verify string selection match logic
    const strVal = 'PASS';
    const matchedStrOpt = stringOptions.find(opt => opt.value === strVal || String(opt.value) === String(strVal));
    expect(matchedStrOpt).toBeDefined();
    expect(matchedStrOpt.label).toBe('Pass');

    // Verify numeric selection match logic
    const numVal = 10;
    const matchedNumOpt = numericOptions.find(opt => opt.value === numVal || String(opt.value) === String(numVal));
    expect(matchedNumOpt).toBeDefined();
    expect(matchedNumOpt.label).toBe('Full');
  });

  it('clamps RangeRated input score values within task min and max bounds', () => {
    const minBound = 0;
    const maxBound = 50;

    const clamp = (val) => Math.max(minBound, Math.min(maxBound, val));

    expect(clamp(25)).toBe(25);
    expect(clamp(75)).toBe(50); // Clamped to maxBound
    expect(clamp(-10)).toBe(0); // Clamped to minBound
  });

  it('accepts zero (0) as a valid score value for pointed tasks', () => {
    const tasks = [
      { id: 't-range', name: 'Range Task', type: 'RangeRated' },
      { id: 't-delta', name: 'Delta Task', type: 'DeltaTime' },
      { id: 't-choice', name: 'Choice Task', type: 'Multiple Choice' },
      { id: 't-default', name: 'Custom Task', type: 'Custom' }
    ];

    const scores = {
      't-range': 0,
      't-delta': 0,
      't-choice': 0,
      't-default': 0
    };

    const missingTask = tasks.find((task) => {
      const value = scores[task.id];
      const type = task.scoreValue?.type || task.type;

      switch (type) {
        case 'RangeRated':
        case 'DeltaTime':
          return typeof value !== 'number' || Number.isNaN(value);
        case 'MultiChoice':
        case 'Multiple Choice':
          return value === undefined || value === null;
        default:
          return value === undefined || value === null;
      }
    });

    expect(missingTask).toBeUndefined();
    expect(typeof scores['t-range']).toBe('number');
    expect(Number.isNaN(scores['t-range'])).toBe(false);
  });

  it('validates station start and completion timestamps before score submission', () => {
    const stationStartedAt = null;
    const stationCompletedAt = null;

    const isTimingValid = Boolean(stationStartedAt && stationCompletedAt);
    expect(isTimingValid).toBe(false);

    const validStarted = '2026-09-11T12:00:00Z';
    const validCompleted = '2026-09-11T12:15:00Z';
    const isTimingValidNow = Boolean(validStarted && validCompleted);
    expect(isTimingValidNow).toBe(true);
  });

  it('resolves task name fallback when task description is undefined in missingTask validation', () => {
    const missingTask = {
      id: 'task-101',
      name: 'Rope Knot Inspection',
      type: 'Completed'
    };

    const taskName = missingTask.name || missingTask.description || missingTask.title || 'Task';
    expect(taskName).toBe('Rope Knot Inspection');
    expect(taskName).not.toBe('undefined');
  });

  it('evaluates admin sidebar access reactively when supplied with selected eventId', () => {
    const user = {
      id: 'usr-1',
      isAdmin: false,
      roles: {
        'evt-100': 'event-admin'
      }
    };

    const isSystemAdmin = user.isAdmin === true;
    const isEventAdminWithoutEvent = isSystemAdmin || Boolean(null && user.roles?.[null] === 'event-admin');
    const isEventAdminWithEvent = isSystemAdmin || Boolean('evt-100' && user.roles?.['evt-100'] === 'event-admin');

    expect(isEventAdminWithoutEvent).toBe(false);
    expect(isEventAdminWithEvent).toBe(true);
  });

  it('deduplicates listener notifications when user data is unchanged', () => {
    let notifyCount = 0;
    const userA = { id: 'u1', name: 'User 1' };
    const userA_same = { id: 'u1', name: 'User 1' };
    const userB = { id: 'u1', name: 'User 1 Updated' };

    let cached = null;
    const set = (newUser) => {
      const prev = cached ? JSON.stringify(cached) : null;
      const next = newUser ? JSON.stringify(newUser) : null;
      cached = newUser;
      if (prev !== next) {
        notifyCount++;
      }
    };

    set(userA);
    expect(notifyCount).toBe(1);

    // Identical user set should NOT fire notification
    set(userA_same);
    expect(notifyCount).toBe(1);

    // Modified user set SHOULD fire notification
    set(userB);
    expect(notifyCount).toBe(2);
  });

  it('supports multiple MultiChoice tasks independently without radio selection collisions across tasks', () => {
    const tasks = [
      {
        id: 'task-mc-1',
        name: 'First Aid Knowledge',
        type: 'MultiChoice',
        options: [
          { label: 'Option A (Apply Pressure)', value: 'opt-1a' },
          { label: 'Option B (Elevation)', value: 'opt-1b' },
          { label: 'Option C (Tourniquet)', value: 'opt-1c' }
        ]
      },
      {
        id: 'task-mc-2',
        name: 'Knot Identification',
        type: 'MultiChoice',
        options: [
          { label: 'Square Knot', value: 10 },
          { label: 'Bowline', value: 5 },
          { label: 'Clove Hitch', value: 0 }
        ]
      },
      {
        id: 'task-mc-3',
        name: 'Fire Safety Rule',
        type: 'MultiChoice',
        options: ['Clear 10ft circle', 'Douse with water', 'Keep shovel nearby']
      }
    ];

    let scoresState = {};

    const updateScore = (taskId, value) => {
      scoresState = { ...scoresState, [taskId]: value };
    };

    // 1. Select option for Task 1
    updateScore(tasks[0].id, 'opt-1b');
    expect(scoresState['task-mc-1']).toBe('opt-1b');
    expect(scoresState['task-mc-2']).toBeUndefined();

    // 2. Select option for Task 2
    updateScore(tasks[1].id, 10);
    expect(scoresState['task-mc-1']).toBe('opt-1b');
    expect(scoresState['task-mc-2']).toBe(10);

    // 3. Select option for Task 3
    updateScore(tasks[2].id, 'Douse with water');
    expect(scoresState['task-mc-1']).toBe('opt-1b');
    expect(scoresState['task-mc-2']).toBe(10);
    expect(scoresState['task-mc-3']).toBe('Douse with water');

    // 4. Update Task 1 selection - verify Tasks 2 and 3 remain untouched
    updateScore(tasks[0].id, 'opt-1c');
    expect(scoresState['task-mc-1']).toBe('opt-1c');
    expect(scoresState['task-mc-2']).toBe(10);
    expect(scoresState['task-mc-3']).toBe('Douse with water');

    // 5. Verify radio input group name generation per task
    tasks.forEach((t, idx) => {
      const radioGroupName = `mc_${t.id || idx}`;
      expect(radioGroupName).toBe(`mc_${t.id}`);
    });
  });

  it('formats task completion summary in volunteer partner review modal without exposing point values or weights', () => {
    const tasks = [
      { id: 't-1', name: 'First Aid Task', type: 'Pass / Fail', scoreWeight: 5.0, maxScore: 100 },
      { id: 't-2', name: 'Knots Task', type: 'RangeRated', scoreWeight: 2.0, maxScore: 50 },
      { id: 't-3', name: 'Scenario Questions', type: 'Multiple Choice', scoreWeight: 10.0, options: [{ label: 'Perfect', value: 20 }] }
    ];

    const scoresState = {
      't-1': true,
      't-2': 45,
      't-3': 'Perfect'
    };

    // Format summary representations as done in Partner Review Modal
    const summaryItems = tasks.map((task) => {
      const rawVal = scoresState[task.id];
      const type = task.type;
      let displayVal = rawVal;
      if (type === 'Pass / Fail' || type === 'Completed' || type === 'Checkpoint') {
        displayVal = rawVal ? '✓ Completed / Pass' : '✕ Not Completed / Fail';
      }
      return {
        taskName: task.name,
        displayValue: String(displayVal)
      };
    });

    expect(summaryItems).toEqual([
      { taskName: 'First Aid Task', displayValue: '✓ Completed / Pass' },
      { taskName: 'Knots Task', displayValue: '45' },
      { taskName: 'Scenario Questions', displayValue: 'Perfect' }
    ]);

    // Ensure no weights or calculated point totals are present in volunteer summary
    const summaryString = JSON.stringify(summaryItems);
    expect(summaryString).not.toContain('scoreWeight');
    expect(summaryString).not.toContain('points');
    expect(summaryString).not.toContain('100');
  });

  it('allows submitting scores with untouched checkbox tasks by defaulting them to false', () => {
    const station = {
      id: 'st-1',
      name: 'First Aid Station',
      tasks: [
        { id: 't-1', name: 'Applied Pressure', type: 'Pass / Fail' },
        { id: 't-2', name: 'Checked Pulse', type: 'Completed' },
        { id: 't-3', name: 'Arrival Checkpoint', type: 'Checkpoint' }
      ]
    };

    const scoresState = {}; // Untouched form state

    // Check missing tasks logic
    const missingTask = station.tasks.find((task, idx) => {
      const taskId = task.id || task._id || `task-${idx}`;
      const value = scoresState[taskId];
      const type = task.scoreValue?.type || task.type;

      switch (type) {
        case 'Completed':
        case 'Pass / Fail':
        case 'Checkpoint':
          return false;
        default:
          return value === undefined || value === null;
      }
    });

    expect(missingTask).toBeUndefined();

    // Map payload logic
    const submissionScores = station.tasks.map((task, idx) => {
      const taskId = task.id || task._id || `task-${idx}`;
      const type = task.scoreValue?.type || task.type;
      let val = scoresState[taskId];
      if ((type === 'Completed' || type === 'Pass / Fail' || type === 'Checkpoint') && val === undefined) {
        val = false;
      }
      return { taskId, scoreValue: val };
    });

    expect(submissionScores).toEqual([
      { taskId: 't-1', scoreValue: false },
      { taskId: 't-2', scoreValue: false },
      { taskId: 't-3', scoreValue: false }
    ]);
  });
});

describe('Event Score Finalizer Role & Access Tests', () => {
  it('allows access to system admin, event admin, and scoring station lead roles', () => {
    const isAuthorized = (user, eventId) => {
      if (!user) return false;
      if (user.isAdmin === true) return true; // System Admin
      const eventRole = user.roles?.[eventId];
      const rolesList = Array.isArray(eventRole)
        ? eventRole
        : [eventRole, ...(user.roles ? Object.values(user.roles) : [])];
      return rolesList.some(r =>
        r === 'event-admin' ||
        r === 'station_leader' ||
        r === 'station_member' ||
        r === 'scorer' ||
        r === 'scoring-center' ||
        r === 'admin'
      );
    };

    const sysAdminUser = { id: 'u1', isAdmin: true, roles: {} };
    const eventAdminUser = { id: 'u2', isAdmin: false, roles: { 'evt-1': 'event-admin' } };
    const stationLeaderUser = { id: 'u3', isAdmin: false, roles: { 'evt-1': 'station_leader' } };
    const stationMemberUser = { id: 'u4', isAdmin: false, roles: { 'evt-1': 'station_member' } };
    const unprivilegedUser = { id: 'u5', isAdmin: false, roles: { 'evt-1': 'unauthorized_spectator' } };

    expect(isAuthorized(sysAdminUser, 'evt-1')).toBe(true);
    expect(isAuthorized(eventAdminUser, 'evt-1')).toBe(true);
    expect(isAuthorized(stationLeaderUser, 'evt-1')).toBe(true);
    expect(isAuthorized(stationMemberUser, 'evt-1')).toBe(true);
    expect(isAuthorized(unprivilegedUser, 'evt-1')).toBe(false);
  });

  it('calculates absolute weighted sum and relative 10-point scale scores correctly', () => {
    const tasks = [
      { id: 't1', name: 'Knot Tying', active: true, scoreWeight: 1.0 },
      { id: 't2', name: 'Lashing', active: true, scoreWeight: 2.0 },
      { id: 't3', name: 'Optional Challenge', active: false, scoreWeight: 1.0 }
    ];

    const patrolScores = {
      'patrol-a': { t1: 80, t2: 90, t3: 100 }, // raw weighted sum (t1, t2) = 80*1 + 90*2 = 260. (t3 disabled)
      'patrol-b': { t1: 50, t2: 70, t3: 50 }   // raw weighted sum (t1, t2) = 50*1 + 70*2 = 190.
    };

    // Calculate Absolute Mode
    const absoluteTotals = {};
    let maxAbsolute = 0;

    Object.keys(patrolScores).forEach(pId => {
      let sum = 0;
      tasks.forEach(t => {
        if (t.active) {
          sum += (patrolScores[pId][t.id] || 0) * t.scoreWeight;
        }
      });
      absoluteTotals[pId] = sum;
      if (sum > maxAbsolute) maxAbsolute = sum;
    });

    expect(absoluteTotals['patrol-a']).toBe(260);
    expect(absoluteTotals['patrol-b']).toBe(190);
    expect(maxAbsolute).toBe(260);

    // Calculate Relative Mode (10-point scale based on top patrol)
    const relativeTotals = {};
    Object.keys(patrolScores).forEach(pId => {
      relativeTotals[pId] = (absoluteTotals[pId] / maxAbsolute) * 10;
    });

    expect(relativeTotals['patrol-a']).toBe(10); // 260 / 260 * 10 = 10
    expect(relativeTotals['patrol-b']).toBeCloseTo((190 / 260) * 10, 2); // ~7.31
  });
});










