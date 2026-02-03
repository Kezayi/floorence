-- Ajouter les nouveaux paramètres de tarification dans system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('memorial_price_future', '{"amount": 15000, "currency": "XOF"}', 'Prix de création si obsèques dans le futur'),
  ('memorial_price_past', '{"amount": 10000, "currency": "XOF"}', 'Prix de création si obsèques dans le passé'),
  ('contribution_link_template', '{"url": "", "enabled": false}', 'Lien externe pour les contributions (Wave, Orange Money, etc.)')
ON CONFLICT (key) DO NOTHING;