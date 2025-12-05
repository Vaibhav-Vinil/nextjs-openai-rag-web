-- Create domains table for storing domain metadata and embeddings
CREATE TABLE IF NOT EXISTS domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  content_types TEXT[] DEFAULT '{}'::TEXT[],
  region TEXT DEFAULT 'Global',
  topics TEXT[] DEFAULT '{}'::TEXT[],
  strengths TEXT[] DEFAULT '{}'::TEXT[],
  avoid_for TEXT[] DEFAULT '{}'::TEXT[],
  reliability_score DECIMAL(3,2) DEFAULT 0.50,
  embedding VECTOR(1536), -- For OpenAI embeddings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS domains_domain_idx ON domains(domain);
CREATE INDEX IF NOT EXISTS domains_category_idx ON domains(category);
CREATE INDEX IF NOT EXISTS domains_region_idx ON domains(region);
CREATE INDEX IF NOT EXISTS domains_reliability_idx ON domains(reliability_score DESC);

-- Enable Row Level Security
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read domains"
  ON domains FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin users to manage domains"
  ON domains FOR ALL
  USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON domains
  FOR EACH ROW
  EXECUTE FUNCTION update_domains_updated_at();

-- Insert authentic domain data
INSERT INTO domains (domain, category, description, content_types, region, topics, strengths, avoid_for, reliability_score) VALUES
-- Solar Manufacturers
('longi.com', 'solar manufacturer', 'LONGi Solar - world leading monocrystalline PV module manufacturer', ARRAY['datasheets', 'product specs', 'news'], 'Global', ARRAY['solar panels', 'monocrystalline', 'pv modules'], ARRAY['high efficiency panels', 'technical specs'], ARRAY['consumer electronics', 'small scale'], 0.95),
('jinkosolar.com', 'solar manufacturer', 'Jinko Solar - one of the largest solar module manufacturers globally', ARRAY['datasheets', 'product specs', 'news'], 'Global', ARRAY['solar panels', 'pv modules', 'solar cells'], ARRAY['cost-effective panels', 'large scale projects'], ARRAY['residential specific', 'small installations'], 0.92),
('trinasolar.com', 'solar manufacturer', 'Trina Solar - leading PV module and smart energy solution provider', ARRAY['datasheets', 'product specs', 'case studies'], 'Global', ARRAY['solar panels', 'smart energy', 'solutions'], ARRAY['system integration', 'project development'], ARRAY['component level research'], 0.90),
('canadiansolar.com', 'solar manufacturer', 'Canadian Solar - vertically integrated solar manufacturer', ARRAY['datasheets', 'product specs', 'investor relations'], 'Global', ARRAY['solar panels', 'solar cells', 'energy storage'], ARRAY['vertical integration', 'financial stability'], ARRAY['emerging markets specific'], 0.88),
('firstsolar.com', 'solar manufacturer', 'First Solar - leading thin-film solar module manufacturer', ARRAY['datasheets', 'product specs', 'sustainability'], 'Global', ARRAY['thin-film', 'utility scale', 'sustainability'], ARRAY['utility projects', 'cadmium telluride'], ARRAY['rooftop solar', 'residential'], 0.87),

-- Solar Inverter Manufacturers
('sungrowpower.com', 'inverter manufacturer', 'Sungrow Power - leading inverter and energy storage system provider', ARRAY['datasheets', 'product specs', 'technical support'], 'Global', ARRAY['inverters', 'energy storage', 'solutions'], ARRAY['string inverters', 'central inverters'], ARRAY['microinverters', 'residential specific'], 0.91),
('huawei.com', 'inverter manufacturer', 'Huawei - leading smart PV inverter and energy storage solution provider', ARRAY['datasheets', 'product specs', 'case studies'], 'Global', ARRAY['smart inverters', 'energy storage', 'ai'], ARRAY['smart technology', 'ai optimization'], ARRAY['traditional inverters', 'budget solutions'], 0.89),
('sma.de', 'inverter manufacturer', 'SMA Solar - leading solar inverter manufacturer with German engineering', ARRAY['datasheets', 'product specs', 'technical support'], 'Global', ARRAY['inverters', 'monitoring', 'solutions'], ARRAY['system monitoring', 'German engineering'], ARRAY['budget inverters', 'emerging markets'], 0.93),
('fronius.com', 'inverter manufacturer', 'Fronius - Austrian inverter manufacturer known for quality', ARRAY['datasheets', 'product specs', 'technical support'], 'Global', ARRAY['inverters', 'welding technology', 'battery charging'], ARRAY['quality manufacturing', 'technical support'], ARRAY['budget solutions', 'large utility'], 0.86),
('growatt.com', 'inverter manufacturer', 'Growatt - cost-effective inverter and energy storage solutions', ARRAY['datasheets', 'product specs', 'news'], 'Global', ARRAY['inverters', 'energy storage', 'monitoring'], ARRAY['cost-effective solutions', 'residential'], ARRAY['utility scale', 'premium features'], 0.84),

-- Energy Storage Companies
('tesla.com', 'energy storage', 'Tesla - leader in electric vehicles and energy storage solutions', ARRAY['product specs', 'news', 'technical papers'], 'Global', ARRAY['energy storage', 'batteries', 'electric vehicles'], ARRAY['brand recognition', 'innovation', 'integration'], ARRAY['budget solutions', 'traditional energy'], 0.96),
('lgchem.com', 'energy storage', 'LG Chem - global chemical company with energy storage solutions', ARRAY['datasheets', 'product specs', 'technical support'], 'Global', ARRAY['batteries', 'energy storage', 'chemical solutions'], ARRAY['chemical expertise', 'reliability'], ARRAY['small scale residential'], 0.90),
('byd.com', 'energy storage', 'BYD - leading manufacturer of batteries and electric vehicles', ARRAY['product specs', 'news', 'technical documentation'], 'Global', ARRAY['batteries', 'electric vehicles', 'energy storage'], ARRAY['cost-effective', 'vertical integration'], ARRAY['premium residential', 'small scale'], 0.88),

-- Mounting Systems
('schletter.com', 'mounting systems', 'Schletter - leading mounting system manufacturer', ARRAY['datasheets', 'product specs', 'installation guides'], 'Global', ARRAY['mounting systems', 'solar racking', 'installation'], ARRAY['engineering excellence', 'system compatibility'], ARRAY['residential small scale', 'budget systems'], 0.87),
('unirac.com', 'mounting systems', 'Unirac - American mounting system provider', ARRAY['datasheets', 'product specs', 'technical support'], 'North America', ARRAY['mounting systems', 'racking', 'installation'], ARRAY['US market expertise', 'customer support'], ARRAY['international markets', 'utility scale'], 0.85),

-- Solar Distributors
('cedsolar.com', 'distributor', 'CED Solar - leading solar equipment distributor', ARRAY['product catalogs', 'pricing', 'technical support'], 'North America', ARRAY['distribution', 'solar equipment', 'logistics'], ARRAY['wide product range', 'distribution network'], ARRAY['direct manufacturing', 'international'], 0.83),
('soligent.net', 'distributor', 'Soligent - solar distribution and solutions provider', ARRAY['product catalogs', 'training', 'support'], 'North America', ARRAY['distribution', 'training', 'solar solutions'], ARRAY['customer education', 'support services'], ARRAY['manufacturing', 'international markets'], 0.81),

-- Research & News
('pv-magazine.com', 'news', 'PV Magazine - leading solar industry news and analysis', ARRAY['news', 'market analysis', 'technical articles'], 'Global', ARRAY['solar news', 'market trends', 'technology updates'], ARRAY['industry insights', 'timely news'], ARRAY['product specifications', 'technical datasheets'], 0.89),
('solarpowerworldonline.com', 'news', 'Solar Power World - solar industry news and resources', ARRAY['news', 'case studies', 'product reviews'], 'Global', ARRAY['solar news', 'industry analysis', 'product reviews'], ARRAY['comprehensive coverage', 'industry expertise'], ARRAY['detailed technical specs', 'manufacturer data'], 0.86),

-- Solar Monitoring Software
('solaredge.com', 'monitoring', 'SolarEdge - solar inverter and monitoring solutions', ARRAY['product specs', 'software documentation', 'case studies'], 'Global', ARRAY['inverters', 'monitoring', 'optimizers'], ARRAY['monitoring technology', 'power optimization'], ARRAY['traditional string inverters', 'budget solutions'], 0.92),
('enphaseenergy.com', 'monitoring', 'Enphase Energy - microinverter and energy management systems', ARRAY['product specs', 'software docs', 'technical support'], 'Global', ARRAY['microinverters', 'monitoring', 'energy management'], ARRAY['microinverter technology', 'system monitoring'], ARRAY['large scale string systems', 'budget solutions'], 0.90),

-- Solar Finance & Policy
('seia.org', 'policy', 'SEIA - Solar Energy Industries Association', ARRAY['policy updates', 'market reports', 'industry statistics'], 'North America', ARRAY['solar policy', 'market data', 'industry advocacy'], ARRAY['policy expertise', 'market insights'], ARRAY['technical specifications', 'product data'], 0.87),
('irena.org', 'policy', 'IRENA - International Renewable Energy Agency', ARRAY['reports', 'statistics', 'policy analysis'], 'Global', ARRAY['renewable energy', 'policy', 'global statistics'], ARRAY['global perspective', 'comprehensive data'], ARRAY['specific product information', 'commercial data'], 0.91)

ON CONFLICT (domain) DO NOTHING;
