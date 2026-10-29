import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Account from './Account';
const fixture = vi.hoisted(() => ({ civility: null as string | null, completed: true, save: vi.fn(), complete: vi.fn() }));
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const identity = vi.hoisted(() => ({ user: { id: 'fixture', email: 'fixture@example.invalid' }, profile: { civility: null as string | null, civility_required: false, display_name: 'Personne Test', avatar_url: 'fixture', profile_completed: true } }));
vi.mock('sonner', () => ({ toast: notices }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: identity.user, loading: false, signOut: vi.fn() }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: identity.profile, loading: false, isProfileComplete: fixture.completed, updateProfile: fixture.save, completeProfile: fixture.complete, refetch: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => { const chain = { select: () => chain, eq: () => chain, is: () => chain, order: () => Promise.resolve({ data: [], error: null }) }; return chain; } } }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/layout/Footer', () => ({ default: () => null }));
vi.mock('@/components/account/AvatarUpload', () => ({ default: () => null }));
vi.mock('@/components/memorial/ResidenceCountrySelect', () => ({ default: () => null }));
const mount = () => { identity.profile = { ...identity.profile, civility: fixture.civility, civility_required: !fixture.completed, profile_completed: fixture.completed }; return render(<MemoryRouter><Account /></MemoryRouter>); };
const choose = () => {
  fireEvent.click(screen.getByRole('combobox', { name: /Civilité/ }));
  fireEvent.click(screen.getByRole('option', { name: 'M.', exact: true }));
};
describe('FIC-01 first declaration and locked account', () => {
  beforeEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); fixture.civility = null; fixture.completed = true; fixture.save.mockResolvedValue({ success: true }); fixture.complete.mockResolvedValue({ success: true }); });
  it.each([true, false])('cancel prevents profile write (historical=%s)', async (historical) => {
    fixture.completed = historical; const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false);
    mount(); choose();
    fireEvent.click(screen.getByRole('button', { name: historical ? 'Enregistrer les modifications' : 'Valider mon profil' }));
    expect(confirmation).toHaveBeenCalledWith('Votre civilité ne pourra plus être modifiée après enregistrement. Confirmez-vous votre choix ?');
    expect(fixture.save).not.toHaveBeenCalled(); expect(fixture.complete).not.toHaveBeenCalled(); expect(notices.success).not.toHaveBeenCalled();
  });
  it('confirmation saves selected civility and waits for a positive reply', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    let finish: ((value: { success: boolean }) => void) | undefined;
    fixture.save.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    mount(); choose(); fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));
    expect(fixture.save).toHaveBeenCalledWith(expect.objectContaining({ civility: 'M.' }));
    expect(notices.success).not.toHaveBeenCalled(); finish?.({ success: true });
    await waitFor(() => expect(notices.success).toHaveBeenCalledTimes(1));
  });
  it('rejected save has no success and leaves declaration editable', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true); fixture.save.mockResolvedValue({ success: false });
    mount(); choose(); fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));
    await waitFor(() => expect(notices.error).toHaveBeenCalled()); expect(notices.success).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: /Civilité/ })).toBeEnabled();
  });
  it('saved civility cannot be edited but other profile fields can be saved without it', async () => {
    fixture.civility = 'M.'; const confirmation = vi.spyOn(window, 'confirm'); mount();
    expect(screen.getByLabelText('Civilité')).toHaveProperty('readOnly', true);
    expect(screen.queryByRole('combobox', { name: /Civilité/ })).toBeNull();
    fireEvent.change(screen.getByDisplayValue('Personne Test'), { target: { value: 'Autre Nom' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));
    await waitFor(() => expect(fixture.save).toHaveBeenCalled());
    expect(fixture.save.mock.calls[0][0]).toMatchObject({ display_name: 'Autre Nom' });
    expect(fixture.save.mock.calls[0][0]).not.toHaveProperty('civility'); expect(confirmation).not.toHaveBeenCalled();
  });
});