import { useEffect } from 'react'
import Hero from '../components/Hero'
import Products from '../components/Products'
import Policy from '../components/Policy'
import Cases from '../components/Cases'
import Calculator from '../components/Calculator'
import ApplyGuide from '../components/ApplyGuide'
import About from '../components/About'

export default function HomePage() {
  // 滚动淡入动画
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible')
      })
    }, { threshold: 0.15 })

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Hero />
      <Products />
      <Policy />
      <Cases />
      <Calculator />
      <ApplyGuide />
      <About />
    </>
  )
}
