import SiteLayout from '../components/SiteLayout.jsx'
import HomeChapter from './Landing.jsx'
import FeaturesChapter from './Product.jsx'
import WorksChapter from './HowItWorks.jsx'

export default function Marketing() {
  return (
    <SiteLayout>
      <HomeChapter />
      <FeaturesChapter />
      <WorksChapter />
    </SiteLayout>
  )
}
