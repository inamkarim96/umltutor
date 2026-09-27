$filePath = "D:\FYP documentation\umltutor\umltutor-frontend\src\pages\student\StudentDashboard.jsx"
$content = Get-Content $filePath -Raw

$oldSidebar = @"
    /* ─── Sidebar: Quick links + UML phases ─── */
    const sidebar = (
        <>
            {/* Quick Actions */}
            <div className="sdb-panel-card">
                <div className="sdb-panel-header">
                    <h3 className="sdb-panel-title"><Target size={15} /> Quick Actions</h3>
                </div>
                <div className="sdb-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                        { label: 'My Classes', icon: <BookOpen size={15} />, path: '/student/classes' },
                        { label: 'Upcoming Work', icon: <Clock size={15} />, path: '/student/upcoming' },
                        { label: 'Submitted Work', icon: <CheckCircle2 size={15} />, path: '/student/submitted' },
                        { label: 'Practice Mode', icon: <Layers size={15} />, path: '/student/practice' },
                    ].map(({ label, icon, path }) => (
                        <button key={path} className="sdb-quick-btn" onClick={() => navigate(path)}>
                            {icon} <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* UML Phase map */}
            <div className="sdb-panel-card">
                <div className="sdb-panel-header">
                    <h3 className="sdb-panel-title"><Activity size={15} /> UML Phases</h3>
                </div>
                <div className="sdb-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {UML_PHASES.map(phase => (
                        <div key={phase.key} className="sdb-phase-row">
                            <span className="sdb-phase-dot" style={{ background: phase.color }} />
                            <span className="sdb-phase-label">{phase.label}</span>
                            <span className="sdb-phase-chip">{phase.short}</span>
                        </div>
                    ))}
                    <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px', lineHeight: 1.5 }}>
                        Each assignment may span multiple UML phases. Check your submission to see phase-by-phase feedback.
                    </p>
                </div>
            </div>
        </>
    );
"@

$newSidebar = @"
    /* ─── Sidebar: Quick links + UML phases ─── */
    const sidebar = useMemo(() => (
        <>
            {/* Quick Actions */}
            <QuickActions
                onNavigate={navigate}
                actions={[
                    { label: 'My Classes', icon: <BookOpen size={15} />, path: '/student/classes' },
                    { label: 'Upcoming Work', icon: <Clock size={15} />, path: '/student/upcoming' },
                    { label: 'Submitted Work', icon: <CheckCircle2 size={15} />, path: '/student/submitted' },
                    { label: 'Practice Mode', icon: <Layers size={15} />, path: '/student/practice' },
                ]}
            />

            {/* UML Phase map */}
            <div className="sdb-panel-card">
                <div className="sdb-panel-header">
                    <h3 className="sdb-panel-title"><Activity size={15} /> UML Phases</h3>
                </div>
                <div className="sdb-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {UML_PHASES.map(phase => (
                        <div key={phase.key} className="sdb-phase-row">
                            <span className="sdb-phase-dot" style={{ background: phase.color }} />
                            <span className="sdb-phase-label">{phase.label}</span>
                            <span className="sdb-phase-chip">{phase.short}</span>
                        </div>
                    ))}
                    <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px', lineHeight: 1.5 }}>
                        Each assignment may span multiple UML phases. Check your submission to see phase-by-phase feedback.
                    </p>
                </div>
            </div>
        </>
    ), [navigate]);
"@

$content = [System.IO.File]::ReadAllText("D:\FYP documentation\umltutor\umltutor-frontend\src\pages\student\StudentDashboard.jsx")
$content = $content.Replace($oldSidebar, $newSidebar)
[System.IO.File]::WriteAllText("D:\FYP documentation\umltutor\umltutor-frontend\src\pages\student\StudentDashboard.jsx", $content)