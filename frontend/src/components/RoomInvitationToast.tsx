import React from 'react';
import { RoomInvitation } from '../../../shared/types';

interface Props {
    invitation: RoomInvitation;
    onAccept: () => void;
    onDecline: () => void;
}

export function RoomInvitationToast({ invitation, onAccept, onDecline }: Props) {
    // Auto-decline after 30 seconds if ignored? Or just let it stay. 
    // Let's keep it simple for now.

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'var(--surface-color, #1e1e1e)',
            border: '1px solid var(--primary-color, #646cff)',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '300px',
            animation: 'slideIn 0.3s ease-out'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {invitation.from.avatar && (
                    <img
                        src={`/avatars/${invitation.from.avatar}.png`}
                        alt="Avatar"
                        style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                    />
                )}
                <div>
                    <div style={{ fontWeight: 'bold' }}>{invitation.from.display_name}</div>
                    <div style={{ fontSize: '0.9rem', color: '#aaa' }}>invited you to play</div>
                    <div style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
                        {formatGameType(invitation.gameType)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                    onClick={onDecline}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #555',
                        background: 'transparent',
                        color: '#ddd',
                        cursor: 'pointer'
                    }}
                >
                    Decline
                </button>
                <button
                    onClick={onAccept}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'var(--primary-color, #646cff)',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Accept
                </button>
            </div>
        </div>
    );
}

function formatGameType(type: string) {
    return type.replace(/_/g, ' ');
}
